import { UsageLog, estimateCost } from "../models/usage-log";
import { createLogger } from "../models/log-entry";

interface TrackUsageParams {
  userId: string;
  conversationId?: string;
  channel: "web" | "whatsapp" | "telegram";
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  durationMs: number;
  toolCalls?: number;
  success: boolean;
  error?: string;
}

/**
 * Track AI usage — called after each chat() invocation.
 * Estimates token counts from text length when exact counts aren't available.
 */
export async function trackUsage(params: TrackUsageParams): Promise<void> {
  const logger = createLogger(params.userId, "system");
  try {
    const promptTokens = params.promptTokens ?? 0;
    const completionTokens = params.completionTokens ?? 0;
    const totalTokens = promptTokens + completionTokens;
    const costUsd = estimateCost(params.model, promptTokens, completionTokens);

    await UsageLog.create({
      userId: params.userId,
      conversationId: params.conversationId,
      channel: params.channel,
      provider: params.provider,
      model: params.model,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
      durationMs: params.durationMs,
      toolCalls: params.toolCalls ?? 0,
      success: params.success,
      error: params.error,
    });

    logger.info(`Usage tracked: ${params.model} ${totalTokens} tokens $${costUsd.toFixed(6)}`, {
      model: params.model,
      tokens: totalTokens,
      cost: costUsd,
      channel: params.channel,
    });
  } catch (e) {
    logger.error("Failed to track usage", { error: String(e) });
  }
}

/**
 * Rough token estimate: ~4 chars per token for English text.
 * Used when exact token counts aren't available from the adapter.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
