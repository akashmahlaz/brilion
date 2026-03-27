import mongoose, { Schema, type Document } from "mongoose";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogSource = "router" | "agent" | "channel" | "cron" | "system" | "api" | "skill";

export interface ILogEntry extends Document {
  userId: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const LogEntrySchema = new Schema<ILogEntry>(
  {
    userId: { type: String, required: true, index: true },
    level: { type: String, enum: ["debug", "info", "warn", "error"], default: "info" },
    source: {
      type: String,
      enum: ["router", "agent", "channel", "cron", "system", "api", "skill"],
      default: "system",
    },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

LogEntrySchema.index({ userId: 1, createdAt: -1 });
LogEntrySchema.index({ userId: 1, level: 1, createdAt: -1 });

// TTL — auto-delete logs older than 30 days
LogEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const LogEntry =
  mongoose.models.LogEntry || mongoose.model<ILogEntry>("LogEntry", LogEntrySchema);

/** Server-side logger that writes to both console and MongoDB */
export function createLogger(userId: string, source: LogSource) {
  const write = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    // Only log errors and warnings to console; info/debug go to DB only
    const prefix = `[${source}]`;
    if (level === "error") console.error(prefix, message, meta ?? "");
    else if (level === "warn") console.warn(prefix, message, meta ?? "");

    // Fire-and-forget DB write
    LogEntry.create({ userId, level, source, message, meta }).catch(() => {});
  };

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
  };
}
