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
app.use(cors());
app.use(express.json());

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/movies', movieRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Movie Catalog API is running...');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
