import mongoose from "mongoose";
import type { MongoClient } from "mongodb";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI ?? `mongodb://localhost:27017/${process.env.DB_NAME || "brilion"}`;
  await mongoose.connect(uri);
  isConnected = true;
  console.log("[db] Connected to MongoDB");
}

/**
 * A MongoClient promise for use with @auth/mongodb-adapter.
 * Self-starting: triggers connectDB() and resolves when connected.
 * Non-blocking at module level (no top-level await).
 */
export const clientPromise: Promise<MongoClient> = connectDB().then(
  () => mongoose.connection.getClient() as unknown as MongoClient
);

export { mongoose };
