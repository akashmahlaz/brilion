/**
 * Cron Scheduler — Executes due cron jobs by dispatching prompts
 * through the AI router and optionally delivering to WhatsApp/Telegram.
 *
 * Runs as an in-process interval timer. Checks for due jobs every 60s.
 * Inspired by OpenClaw's heartbeat-runner pattern.
 */
import { CronJob } from "../models/cron-job";
import { connectDB } from "../db";

const log = (...args: unknown[]) => console.log("[cron-scheduler]", ...args);
const logErr = (...args: unknown[]) => console.error("[cron-scheduler]", ...args);

const TICK_INTERVAL_MS = 60_000; // Check every 60 seconds
const HEARTBEAT_EVERY_N_TICKS = 5; // Run heartbeat every 5 ticks (~5 min)
let tickTimer: NodeJS.Timeout | null = null;
let tickCount = 0;

/** Parse a simple cron expression and return the next run date */
function nextCronRun(schedule: string, _timezone: string, after = new Date()): Date | null {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minStr, hourStr, domStr, monStr, dowStr] = parts;
  const parseField = (field: string, max: number): number[] => {
    if (field === "*") return Array.from({ length: max + 1 }, (_, i) => i);
    if (field.includes("/")) {
      const [, step] = field.split("/");
      const s = parseInt(step, 10);
      return Array.from({ length: Math.ceil((max + 1) / s) }, (_, i) => i * s);
    }
    if (field.includes(",")) return field.split(",").map(Number);
    if (field.includes("-")) {
      const [a, b] = field.split("-").map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    }
    return [parseInt(field, 10)];
  };

  const minutes = parseField(minStr, 59);
  const hours = parseField(hourStr, 23);
  const doms = parseField(domStr, 31);
  const months = parseField(monStr, 12);
  const dows = parseField(dowStr, 6);

  // Brute-force search for the next matching minute (within 48 hours)
  const limit = new Date(after.getTime() + 48 * 60 * 60_000);
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  while (candidate < limit) {
    if (
      minutes.includes(candidate.getMinutes()) &&
      hours.includes(candidate.getHours()) &&
      (domStr === "*" || doms.includes(candidate.getDate())) &&
      (monStr === "*" || months.includes(candidate.getMonth() + 1)) &&
      (dowStr === "*" || dows.includes(candidate.getDay()))
    ) {
      return candidate;
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
}

/** Check if a job is due to run right now (within 60s tolerance) */
function isDue(nextRunAt: Date | undefined, now: Date): boolean {
  if (!nextRunAt) return false;
  const diff = now.getTime() - nextRunAt.getTime();
  return diff >= 0 && diff < TICK_INTERVAL_MS;
}

/** Execute a single cron job */
async function executeJob(job: InstanceType<typeof CronJob>): Promise<void> {
  log(`Executing cron job "${job.name}" (${job._id}) for user ${job.userId}`);
  const startTime = Date.now();

  try {
    // Lazy import to avoid circular dependencies
    const { chat, maxIterations } = await import("@tanstack/ai");
    const { getAgentConfig } = await import("./agent");

    const agentConfig = await getAgentConfig(job.userId, { channel: "cron" });

    const result = await chat({
      adapter: agentConfig.adapter,
      messages: [{ role: "user", content: job.prompt }],
      systemPrompts: agentConfig.systemPrompts,
      tools: agentConfig.tools,
      agentLoopStrategy: maxIterations(agentConfig.maxSteps ?? 10),
      stream: false,
    }) as string;

    const durationMs = Date.now() - startTime;
    log(`Cron job "${job.name}" completed (${durationMs}ms). Response: ${result.substring(0, 200)}`);

    // Deliver result to configured channel
    if (job.channel === "whatsapp") {
      const { sendWhatsAppMessage, isWhatsAppConnected } = await import("../channels/whatsapp");
      const { getOwnerJid } = await import("./wa-manager");
      if (isWhatsAppConnected(job.userId)) {
        const ownerJid = getOwnerJid(job.userId);
        if (ownerJid) {
          await sendWhatsAppMessage(job.userId, ownerJid, `🕐 *${job.name}*\n\n${result}`);
          log(`Cron result delivered via WhatsApp to owner`);
        }
      }
    }

    // Update job status
    job.lastRunAt = new Date();
    job.lastRunStatus = "success";
    job.lastRunError = undefined;
    job.lastRunDurationMs = durationMs;
    job.runCount = (job.runCount || 0) + 1;
    job.nextRunAt = nextCronRun(job.schedule, job.timezone) || undefined;
    await job.save();
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logErr(`Cron job "${job.name}" FAILED:`, err);

    job.lastRunAt = new Date();
    job.lastRunStatus = "error";
    job.lastRunError = err instanceof Error ? err.message : String(err);
    job.lastRunDurationMs = durationMs;
    job.nextRunAt = nextCronRun(job.schedule, job.timezone) || undefined;
    await job.save();
  }
}

/** Execute heartbeat: read each active user's HEARTBEAT.md and let AI handle due tasks */
async function runHeartbeats(): Promise<void> {
  try {
    const { WorkspaceFile } = await import("../models/workspace-file");
    // Find all HEARTBEAT.md files that have actual content beyond the default template
    const heartbeats = await WorkspaceFile.find({
      filename: "HEARTBEAT.md",
      content: { $exists: true, $ne: "" },
    }).lean();

    for (const hb of heartbeats as any[]) {
      const content = hb.content as string;
      // Skip if it's just the default template with no real tasks
      if (
        content.includes("(None configured yet") &&
        !content.includes("- [") && // no checklist items
        content.split("\n").length < 12
      ) {
        continue;
      }

      const userId = hb.userId?.toString();
      if (!userId) continue;

      log(`Heartbeat: executing for user ${userId}`);
      try {
        const { chat, maxIterations } = await import("@tanstack/ai");
        const { getAgentConfig } = await import("./agent");
        const agentConfig = await getAgentConfig(userId, { channel: "cron" });

        const now = new Date();
        const prompt = `[HEARTBEAT CHECK — ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}]

Review your HEARTBEAT.md for any tasks that are DUE NOW or OVERDUE. Execute them using your available tools. If nothing is due, respond with just "No tasks due." and nothing else.

Current HEARTBEAT.md contents:
${content}`;

        const result = await chat({
          adapter: agentConfig.adapter,
          messages: [{ role: "user", content: prompt }],
          systemPrompts: agentConfig.systemPrompts,
          tools: agentConfig.tools,
          agentLoopStrategy: maxIterations(agentConfig.maxSteps ?? 10),
          stream: false,
        }) as string;

        if (result && !result.toLowerCase().includes("no tasks due")) {
          log(`Heartbeat result for ${userId}: ${result.substring(0, 200)}`);
          // Deliver result via WhatsApp if connected
          try {
            const { sendWhatsAppMessage, isWhatsAppConnected } = await import("../channels/whatsapp");
            const { getOwnerJid } = await import("./wa-manager");
            if (isWhatsAppConnected(userId)) {
              const ownerJid = getOwnerJid(userId);
              if (ownerJid) {
                await sendWhatsAppMessage(userId, ownerJid, `💓 *Heartbeat*\n\n${result}`);
              }
            }
          } catch {
            // Channel delivery failed — non-critical
          }
        }
      } catch (e) {
        logErr(`Heartbeat failed for user ${userId}:`, e);
      }
    }
  } catch (e) {
    logErr("Heartbeat scan failed:", e);
  }
}

/** Main scheduler tick — find and execute due jobs */
async function tick(): Promise<void> {
  try {
    await connectDB();
    const now = new Date();
    tickCount++;

    // Run heartbeat every N ticks (~5 min)
    if (tickCount % HEARTBEAT_EVERY_N_TICKS === 0) {
      runHeartbeats().catch(logErr);
    }

    // Find all active jobs that are due
    const dueJobs = await CronJob.find({
      status: "active",
      nextRunAt: { $lte: now },
    }).limit(20);

    if (dueJobs.length > 0) {
      log(`Found ${dueJobs.length} due cron job(s)`);
    }

    // Execute each due job — enqueue to BullMQ if available, else inline
    for (const job of dueJobs) {
      if (isDue(job.nextRunAt, now)) {
        // Update nextRunAt immediately to prevent duplicate execution across instances
        job.nextRunAt = nextCronRun(job.schedule, job.timezone) || undefined;
        await job.save();

        try {
          const { enqueueCronJob } = await import("./message-queue");
          const jobId = await enqueueCronJob({
            cronJobId: job._id.toString(),
            userId: job.userId,
            name: job.name,
            prompt: job.prompt,
            channel: job.channel,
            enqueuedAt: Date.now(),
          });
          if (jobId) {
            log(`Cron job "${job.name}" enqueued to BullMQ: ${jobId}`);
            continue; // BullMQ will handle execution
          }
        } catch {
          // BullMQ unavailable — fall through to inline execution
        }

        await executeJob(job);
      }
    }
  } catch (err) {
    logErr("Cron tick failed:", err);
  }
}

/** Start the cron scheduler (called at server init) */
export function startCronScheduler(): void {
  if (tickTimer) {
    log("Scheduler already running");
    return;
  }
  log("Starting cron scheduler (checking every 60s)");

  // Run first tick after a short delay
  setTimeout(() => tick().catch(logErr), 5000);

  tickTimer = setInterval(() => {
    tick().catch(logErr);
  }, TICK_INTERVAL_MS);
}

/** Stop the cron scheduler */
export function stopCronScheduler(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    log("Cron scheduler stopped");
  }
}

/** Compute and set nextRunAt for a job (used when creating/updating jobs) */
export function computeNextRun(schedule: string, timezone = "UTC"): Date | null {
  return nextCronRun(schedule, timezone);
}
