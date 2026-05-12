import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import webhookRoutes from './routes/webhook.js';
import movieRoutes from './routes/movies.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

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
