import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_OPTS = {
  serverSelectionTimeoutMS: 5000,    // reduced from 10s — fail faster on cold start
  socketTimeoutMS:          45000,
  connectTimeoutMS:         5000,    // reduced from 10s
  heartbeatFrequencyMS:     10000,
  maxPoolSize:              10,
  retryWrites:              true,
  retryReads:               true,
};

// Cache the connection promise across Vercel serverless invocations.
// On a warm function instance, mongoose.connection.readyState === 1 means
// we're already connected — skip the connect() call entirely.
let connectionPromise = null;

const connectDB = async () => {
  // Already connected — reuse the existing connection (warm invocation)
  if (mongoose.connection.readyState === 1) return;

  // Connection in progress — wait for it (concurrent cold starts)
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, MONGO_OPTS)
    .then(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      }
    })
    .catch((error) => {
      console.error(`MongoDB connection failed: ${error.message}`);
      connectionPromise = null; // reset so next request retries
      throw error;
    });

  return connectionPromise;
};

mongoose.connection.on('disconnected', () => {
  connectionPromise = null; // reset cache so next request reconnects
  if (process.env.NODE_ENV !== 'production') {
    console.warn('MongoDB disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

export default connectDB;
