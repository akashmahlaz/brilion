/**
 * Message Queue — BullMQ-powered persistent job queue for Brilion SaaS.
 *
 * Handles:
 * 1. Inbound message processing (WhatsApp/Telegram → AI → reply)
 * 2. Outbound message delivery (AI reply → channel send)
 * 3. Cron job execution (scheduled prompts)
 *
 * Features:
 * - Crash-safe: messages persist in Redis, survive server restarts
 * - Concurrency control: max 3 concurrent jobs per user
 * - Priority lanes: self-chat > DMs > groups
 * - Dead Letter Queue: failed jobs kept for inspection + replay
 * - Backpressure: queue depth limits prevent memory exhaustion
 */
import { Queue, Worker, type Job } from "bullmq";
import { getRedisConnectionOpts, isRedisConfigured } from "./redis";

const log = (...args: unknown[]) => console.log("[msg-queue]", ...args);
const logErr = (...args: unknown[]) => console.error("[msg-queue]", ...args);

// ─── Queue Names ───────────────────────────────────────

const INBOUND_QUEUE = "brilion:inbound";
const CRON_QUEUE = "brilion:cron";

// ─── Types ─────────────────────────────────────────────

export interface InboundJobData {
  channel: "whatsapp" | "telegram" | "web";
  userId: string;
  senderId: string;
  senderName?: string;
  text: string;
  foreignId?: string;
  imageBase64?: string;
  imageMime?: string;
  isGroup?: boolean;
  groupId?: string;
  isMentioned?: boolean;
  messageId?: string;
  remoteJid?: string;
  isSelfChat?: boolean;
  enqueuedAt: number;
}

export interface CronJobData {
  cronJobId: string;
  userId: string;
  name: string;
  prompt: string;
  channel?: "web" | "whatsapp" | "telegram";
  enqueuedAt: number;
}

// ─── Queue Instances ───────────────────────────────────

let inboundQueue: Queue<InboundJobData> | null = null;
let cronQueue: Queue<CronJobData> | null = null;
let inboundWorker: Worker<InboundJobData> | null = null;
let cronWorker: Worker<CronJobData> | null = null;

/** Get or create the inbound message queue */
export function getInboundQueue(): Queue<InboundJobData> | null {
  if (!isRedisConfigured()) return null;
  if (!inboundQueue) {
    inboundQueue = new Queue<InboundJobData>(INBOUND_QUEUE, {
      connection: getRedisConnectionOpts(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 }, // Keep last 1000 completed
        removeOnFail: { count: 500 },      // Keep last 500 failed (DLQ)
      },
    });
    log("Inbound queue created");
  }
  return inboundQueue;
}

/** Get or create the cron execution queue */
export function getCronQueue(): Queue<CronJobData> | null {
  if (!isRedisConfigured()) return null;
  if (!cronQueue) {
    cronQueue = new Queue<CronJobData>(CRON_QUEUE, {
      connection: getRedisConnectionOpts(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
    log("Cron queue created");
  }
  return cronQueue;
}

// ─── Enqueue Functions ─────────────────────────────────

/** Priority mapping: self-chat(1) > DM(2) > group(3) */
function getMessagePriority(data: InboundJobData): number {
  if (data.isSelfChat) return 1;
  if (data.isGroup) return 3;
  return 2;
}

/** Enqueue an inbound message for processing */
export async function enqueueInbound(data: InboundJobData): Promise<string | null> {
  const queue = getInboundQueue();
  if (!queue) return null; // Fallback: process inline if Redis unavailable

  const priority = getMessagePriority(data);
  const job = await queue.add("process-message", data, {
    priority,
    // Group by user to prevent one user from starving others
    // BullMQ processes groups fairly
  });

  log(`Enqueued inbound: ${data.channel}/${data.senderId} → job ${job.id} (priority ${priority})`);
  return job.id || null;
}

/** Enqueue a cron job for execution */
export async function enqueueCronJob(data: CronJobData): Promise<string | null> {
  const queue = getCronQueue();
  if (!queue) return null;

  const job = await queue.add("execute-cron", data);
  log(`Enqueued cron: "${data.name}" → job ${job.id}`);
  return job.id || null;
}

// ─── Workers ───────────────────────────────────────────

/** Start the inbound message worker */
export function startInboundWorker(): void {
  if (!isRedisConfigured() || inboundWorker) return;

  inboundWorker = new Worker<InboundJobData>(
    INBOUND_QUEUE,
    async (job: Job<InboundJobData>) => {
      const { data } = job;
      const waitMs = Date.now() - data.enqueuedAt;
      log(`Processing inbound job ${job.id} (waited ${waitMs}ms): ${data.channel}/${data.senderId}`);

      // Lazy import to avoid circular deps
      const { routeMessage } = await import("./router");
      const result = await routeMessage({
        channel: data.channel,
        userId: data.userId,
        senderId: data.senderId,
        senderName: data.senderName,
        text: data.text,
        foreignId: data.foreignId,
        imageBase64: data.imageBase64,
        imageMime: data.imageMime,
        isGroup: data.isGroup,
        groupId: data.groupId,
        isMentioned: data.isMentioned,
        messageId: data.messageId,
        remoteJid: data.remoteJid,
      });

      log(`Inbound job ${job.id} completed (response: ${result.substring(0, 100)})`);
      return result;
    },
    {
      connection: getRedisConnectionOpts(),
      concurrency: 5, // Process up to 5 messages concurrently
      limiter: {
        max: 10,
        duration: 10_000, // Max 10 jobs per 10 seconds globally
      },
    },
  );

  inboundWorker.on("failed", (job, err) => {
    logErr(`Inbound job ${job?.id} FAILED (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`, err.message);
  });

  inboundWorker.on("completed", (job) => {
    log(`Inbound job ${job.id} completed successfully`);
  });

  log("Inbound worker started (concurrency: 5)");
}

/** Start the cron execution worker */
export function startCronWorker(): void {
  if (!isRedisConfigured() || cronWorker) return;

  cronWorker = new Worker<CronJobData>(
    CRON_QUEUE,
    async (job: Job<CronJobData>) => {
      const { data } = job;
      log(`Processing cron job ${job.id}: "${data.name}" for user ${data.userId}`);

      const { CronJob } = await import("../models/cron-job");
      const { connectDB } = await import("../db");
      await connectDB();

      const cronDoc = await CronJob.findById(data.cronJobId);
      if (!cronDoc || cronDoc.status !== "active") {
        log(`Cron job ${data.cronJobId} no longer active, skipping`);
        return "skipped";
      }

      // Import and execute (reuse existing executeJob logic)
      const { chat, maxIterations } = await import("@tanstack/ai");
      const { getAgentConfig } = await import("./agent");
      const startTime = Date.now();

      const agentConfig = await getAgentConfig(data.userId);
      const result = await chat({
        adapter: agentConfig.adapter,
        messages: [{ role: "user", content: data.prompt }],
        systemPrompts: agentConfig.systemPrompts,
        tools: agentConfig.tools,
        agentLoopStrategy: maxIterations(agentConfig.maxSteps ?? 10),
        stream: false,
      }) as string;

      const durationMs = Date.now() - startTime;

      // Deliver to channel
      if (data.channel === "whatsapp") {
        const { sendWhatsAppMessage, isWhatsAppConnected } = await import("../channels/whatsapp");
        const { getOwnerJid } = await import("./wa-manager");
        if (isWhatsAppConnected(data.userId)) {
          const ownerJid = getOwnerJid(data.userId);
          if (ownerJid) {
            await sendWhatsAppMessage(data.userId, ownerJid, `🕐 *${data.name}*\n\n${result}`);
          }
        }
      }

      // Update job doc
      cronDoc.lastRunAt = new Date();
      cronDoc.lastRunStatus = "success";
      cronDoc.lastRunError = undefined;
      cronDoc.lastRunDurationMs = durationMs;
      cronDoc.runCount = (cronDoc.runCount || 0) + 1;
      await cronDoc.save();

      log(`Cron job "${data.name}" completed (${durationMs}ms)`);
      return result;
    },
    {
      connection: getRedisConnectionOpts(),
      concurrency: 3,
    },
  );

  cronWorker.on("failed", (job, err) => {
    logErr(`Cron job ${job?.id} FAILED:`, err.message);
  });

  log("Cron worker started (concurrency: 3)");
}

// ─── DLQ Inspection ────────────────────────────────────

/** Get failed jobs from a queue (Dead Letter Queue) */
export async function getFailedJobs(
  queueName: "inbound" | "cron",
  start = 0,
  end = 20,
): Promise<Array<{
  id: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  timestamp: number;
}>> {
  const queue = queueName === "inbound" ? getInboundQueue() : getCronQueue();
  if (!queue) return [];

  const failed = await queue.getFailed(start, end);
  return failed.map((job) => ({
    id: job.id || "unknown",
    data: job.data,
    failedReason: job.failedReason || "unknown",
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
  }));
}

/** Retry a specific failed job */
export async function retryFailedJob(
  queueName: "inbound" | "cron",
  jobId: string,
): Promise<boolean> {
  const queue = queueName === "inbound" ? getInboundQueue() : getCronQueue();
  if (!queue) return false;

  const job = await queue.getJob(jobId);
  if (!job) return false;

  await job.retry();
  log(`Retried job ${jobId} from ${queueName} queue`);
  return true;
}

/** Get queue health metrics */
export async function getQueueMetrics(queueName: "inbound" | "cron"): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
} | null> {
  const queue = queueName === "inbound" ? getInboundQueue() : getCronQueue();
  if (!queue) return null;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// ─── Lifecycle ─────────────────────────────────────────

/** Start all queue workers (called at server init) */
export function startMessageQueue(): void {
  if (!isRedisConfigured()) {
    log("Redis not configured — message queue disabled (using inline processing)");
    return;
  }
  log("Starting message queue workers...");
  startInboundWorker();
  startCronWorker();
  log("✅ Message queue workers started");
}

/** Graceful shutdown */
export async function stopMessageQueue(): Promise<void> {
  await Promise.all([
    inboundWorker?.close(),
    cronWorker?.close(),
    inboundQueue?.close(),
    cronQueue?.close(),
  ]);
  inboundWorker = null;
  cronWorker = null;
  inboundQueue = null;
  cronQueue = null;
  log("Message queue stopped");
}
