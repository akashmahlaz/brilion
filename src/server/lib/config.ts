import { Config } from "../models/config";
import { connectDB } from "../db";

const DEFAULT_ID = "singleton";

export async function loadConfig(userId?: string) {
  await connectDB();
  const id = userId || DEFAULT_ID;
  let config = await Config.findById(id);
  if (!config) {
    config = await Config.create({ _id: id });
  }
  return config;
}

export async function saveConfig(config: any) {
  await connectDB();
  config.meta = config.meta || {};
  config.meta.lastTouchedAt = new Date().toISOString();
  await config.save();
  return config;
}

export async function updateConfig(id: string, updates: Record<string, any>) {
  await connectDB();
  return Config.findByIdAndUpdate(id || DEFAULT_ID, updates, { new: true });
}
