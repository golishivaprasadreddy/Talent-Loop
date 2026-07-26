import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not configured. Database routes require a MongoDB connection.");
}

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not configured.");

  // Return existing live connection
  if (cached.conn) return cached.conn;

  // Create new promise only if none is in-flight
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000, // fail fast on bad URI / IP block
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,           // reuse connections across warm invocations
        minPoolSize: 1,
      })
      .catch((err) => {
        // Reset so the next request retries instead of re-awaiting a dead promise
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
