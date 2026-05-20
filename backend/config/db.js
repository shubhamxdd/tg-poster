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

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, MONGO_OPTS);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`MongoDB initial connection failed: ${error.message}`);
    // Retry after 5s instead of crashing
    console.log('Retrying in 5s…');
    setTimeout(connectDB, 5000);
  }
};

// Auto-reconnect on unexpected disconnects
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected — attempting reconnect…');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

export default connectDB;
