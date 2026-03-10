import mongoose from "mongoose";
import type { MongoClient } from "mongodb";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/justbecause";
  await mongoose.connect(uri);
  isConnected = true;
  console.log("[db] Connected to MongoDB");
}

/**
 * A MongoClient promise for use with @auth/mongodb-adapter.
 * Resolves the underlying client from the mongoose connection.
 */
export const clientPromise: Promise<MongoClient> = new Promise((resolve) => {
  const check = () => {
    const client = mongoose.connection.getClient() as unknown as MongoClient;
    if (client) return resolve(client);
    mongoose.connection.once("connected", () => {
      resolve(mongoose.connection.getClient() as unknown as MongoClient);
    });
  };
  check();
});

export { mongoose };
