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

// ── Bot Prerender Middleware ──────────────────────────────────────────────────
// Telegram, WhatsApp, Twitter etc. send bot user-agents and can't run JS.
// We intercept their requests to detail page URLs and return a minimal HTML
// page with correct OG meta tags so link previews show the movie details.
// Real browser requests pass straight through to the SPA via Vercel rewrites.

const BOT_UA = /telegrambot|whatsapp|twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|applebot|googlebot|bingbot|duckduckbot|embedly|pinterest|vkshare|w3c_validator/i;

const SLUG_TYPES = ['movie', 'series', 'anime'];

// Import Movie model for the prerender lookup
import Movie from './models/Movie.js';

app.get('/:type/:slug', async (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (!BOT_UA.test(ua)) return next(); // real user — skip to SPA

  const { type, slug } = req.params;
  if (!SLUG_TYPES.includes(type)) return next();

  try {
    // Extract MongoDB ObjectId from the end of the slug (last 24 hex chars)
    const parts = slug.split('-');
    let movieId = null;
    for (let n = 1; n <= 4; n++) {
      const candidate = parts.slice(parts.length - n).join('');
      if (/^[a-f0-9]{24}$/i.test(candidate)) { movieId = candidate; break; }
    }
    if (!movieId) return next();

    const movie = await Movie.findById(movieId).lean();
    if (!movie) return next();

    const title = `${movie.title}${movie.year ? ` (${movie.year})` : ''} — CineVault`;
    const description = (movie.overview || `Download ${movie.title} on CineVault`).slice(0, 200);
    const image = movie.backdrop || movie.poster || '';
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const siteName = 'CineVault';

    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html>
<html prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <meta name="description" content="${description}"/>
  <meta property="og:site_name" content="${siteName}"/>
  <meta property="og:type" content="video.movie"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:url" content="${url}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${description}"/>
  <meta name="twitter:image" content="${image}"/>
</head>
<body></body>
</html>`);
  } catch (err) {
    console.error('Prerender error:', err);
    return next();
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Movie Catalog API is running...');
});

// Fallback for real browser requests on detail page routes — serve the SPA
// (Bot requests are handled above; real users get next() which lands here)
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/:type/:slug', (req, res) => {
  const { type } = req.params;
  if (!SLUG_TYPES.includes(type)) return res.status(404).send('Not found');
  // In production, Vercel serves static files; this is only needed locally
  const indexPath = join(__dirname, '../dist/index.html');
  if (existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  // Dev fallback
  res.send('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/"/></head></html>');
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
