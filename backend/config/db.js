import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_OPTS = {
  serverSelectionTimeoutMS: 10000,   // fail fast on initial connect
  socketTimeoutMS:          45000,   // drop idle sockets after 45s
  connectTimeoutMS:         10000,
  heartbeatFrequencyMS:     10000,   // ping server every 10s to keep alive
  maxPoolSize:              10,
  retryWrites:              true,
  retryReads:               true,
};

// Cache the connection promise so Vercel serverless warm instances
// reuse the existing connection instead of reconnecting on every request.
let connectionPromise = null;

const connectDB = async () => {
  // Already connected — nothing to do
  if (mongoose.connection.readyState === 1) return;

  // In-flight connection — wait for it instead of opening a second one
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, MONGO_OPTS)
    .then(() => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    })
    .catch((error) => {
      console.error(`MongoDB connection failed: ${error.message}`);
      connectionPromise = null; // reset so the next request can retry
      throw error;
    });

  return connectionPromise;
};

// Auto-reconnect on unexpected disconnects
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected — will reconnect on next request');
  connectionPromise = null;
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

export default connectDB;
