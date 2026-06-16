import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import webhookRoutes from './routes/webhook.js';
import movieRoutes from './routes/movies.js';

dotenv.config();

// Prevent nodemon from crashing on unhandled DB rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const app = express();

// Connect to MongoDB before every request — cached on warm instances (no-op if already connected)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error on request:', err.message);
    res.status(503).json({ message: 'Database unavailable. Please try again.' });
  }
});

// Middleware
app.use(cors({
  origin: '*', // Adjust for production if needed
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password'],
}));
app.use(express.json());

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/movies', movieRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Movie Catalog API is running...');
});

const PORT = process.env.PORT || 3000;

// Only start the server if we're not running as a serverless function
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel Serverless
export default app;
