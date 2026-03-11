import { Config } from "../models/config";
import { connectDB } from "../db";

const log = (...args: unknown[]) => console.log("[config]", ...args);

/**
 * Load config by userId. If no userId is provided, returns the first
 * config in the DB (single-user fallback). Creates a new default
 * config when userId is given but no config exists yet.
 */
export async function loadConfig(userId?: string) {
  await connectDB();
  log("loadConfig() userId:", userId || "(none — fallback mode)");

  let config;

  if (userId) {
    config = await Config.findOne({ userId });
    if (!config) {
      log("No config found, creating default for userId:", userId);
      config = await Config.create({ userId });
    }
  } else {
    // No userId — single-user fallback: grab the first config
    config = await Config.findOne({});
    if (!config) {
      log("No config in DB and no userId — returning in-memory defaults");
      // Return an unsaved Mongoose doc with schema defaults
      return new Config({});
    }
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

export async function updateConfig(
  userId: string,
  updates: Record<string, any>
) {
  await connectDB();
  return Config.findOneAndUpdate({ userId }, updates, { new: true });
}
