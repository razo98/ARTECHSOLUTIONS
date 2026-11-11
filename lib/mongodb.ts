import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = global as typeof globalThis & { mongooseCache?: Cache };
const cached = globalWithMongoose.mongooseCache ?? { conn: null, promise: null };
globalWithMongoose.mongooseCache = cached;

export async function connectDB() {
  if (!MONGODB_URI) throw new Error("Ajoutez MONGODB_URI dans votre fichier .env.local");
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 10000 });
  try { cached.conn = await cached.promise; }
  catch (error) { cached.promise = null; throw error; }
  return cached.conn;
}
