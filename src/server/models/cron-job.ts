import mongoose, { Schema, type Document } from "mongoose";

export type CronStatus = "active" | "paused" | "error";

export interface ICronJob extends Document {
  userId: string;
  name: string;
  description?: string;
  schedule: string; // cron expression e.g. "0 9 * * *"
  timezone: string;
  status: CronStatus;
  prompt: string; // what to tell the AI agent
  channel?: "web" | "whatsapp" | "telegram";
  lastRunAt?: Date;
  lastRunStatus?: "success" | "error";
  lastRunError?: string;
  lastRunDurationMs?: number;
  nextRunAt?: Date;
  runCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const CronJobSchema = new Schema<ICronJob>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    schedule: { type: String, required: true },
    timezone: { type: String, default: "UTC" },
    status: { type: String, enum: ["active", "paused", "error"], default: "active" },
    prompt: { type: String, required: true },
    channel: { type: String, enum: ["web", "whatsapp", "telegram"] },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ["success", "error"] },
    lastRunError: { type: String },
    lastRunDurationMs: { type: Number },
    nextRunAt: { type: Date },
    runCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
  },
  { timestamps: true }
);

CronJobSchema.index({ userId: 1, status: 1 });
CronJobSchema.index({ status: 1, nextRunAt: 1 });

export const CronJob =
  mongoose.models.CronJob || mongoose.model<ICronJob>("CronJob", CronJobSchema);
