/**
 * api/og.js — Dynamic OG meta tag injector for CineVault
 *
 * All /movie/:slug, /series/:slug, /anime/:slug requests go through here.
 *
 * - BOT / crawler User-Agents:
 *     Returns a minimal HTML page with the correct <title>, og:title,
 *     og:description, og:image (poster) from the database.
 *     This makes shared links unfurl correctly in Telegram, WhatsApp,
 *     Discord, Slack, Twitter/X, Facebook, etc.
 *
 * - Real browsers:
 *     Returns the React SPA's index.html so the app boots normally.
 *     The React app then does its own title update via document.title.
 */

import { readFileSync } from 'fs';
import path from 'path';
import connectDB from '../backend/config/db.js';
import Movie from '../backend/models/Movie.js';

// ── Bot / crawler detection ──────────────────────────────────────────────────
const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|discordbot|slackbot|applebot|googlebot|bingbot|duckduckbot|semrushbot|ahrefsbot|yandex|baidu|sogou|exabot|ia_archiver|embedly|preview|iframely|vkshare|line-poker|nuzzel|outbrain|pinterestbot|quora|rogerbot|showyoubot|skypeuripreview|tumblr|viberbot|w3c_validator|xing-contenttabreceiver/i;

function isBot(userAgent = '') {
  return BOT_RE.test(userAgent);
}

// ── Slug → MongoDB lookup ────────────────────────────────────────────────────
function extractIdFromSlug(slug) {
  const parts = slug.split('-');
  const last = parts[parts.length - 1];
  if (/^[a-f0-9]{24}$/i.test(last)) return { type: 'full', id: last };
  if (/^[a-f0-9]{8}$/i.test(last))  return { type: 'suffix', id: last };
  return null;
}

async function findMovie(slug) {
  // Enforce a hard timeout so the serverless function never hangs silently.
  // 8s leaves headroom under Vercel's 10s default function timeout.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('DB lookup timed out')), 8000)
  );
  return Promise.race([_findMovieInner(slug), timeout]);
}

async function _findMovieInner(slug) {
  await connectDB();
  const parsed = extractIdFromSlug(slug);
  if (!parsed) return null;

  if (parsed.type === 'full') {
    return Movie.findById(parsed.id).lean();
  }

  // 8-char suffix — scan ObjectId strings (same logic as movieController)
  const allIds = await Movie.find({}, { _id: 1 }).lean();
  const match = allIds.find(doc =>
    doc._id.toString().endsWith(parsed.id.toLowerCase())
  );
  return match ? Movie.findById(match._id).lean() : null;
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildOgHtml({ title, description, poster, url, type }) {
  const ogType = type === 'movie' ? 'video.movie' : 'video.tv_show';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)} — CineVault</title>
  <meta name="description" content="${esc(description)}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="${ogType}" />
  <meta property="og:site_name"   content="CineVault" />
  <meta property="og:url"         content="${esc(url)}" />
  <meta property="og:title"       content="${esc(title)} — CineVault" />
  <meta property="og:description" content="${esc(description)}" />
  ${poster ? `<meta property="og:image"       content="${esc(poster)}" />
  <meta property="og:image:width"  content="500" />
  <meta property="og:image:height" content="750" />` : ''}

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)} — CineVault" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${poster ? `<meta name="twitter:image" content="${esc(poster)}" />` : ''}
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
</body>
</html>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ua   = req.headers['user-agent'] || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const fullPath = req.url; // e.g. /movie/castlevania-2023-686022e1f3fd5cb2d9ac34c1

  // Extract /:type/:slug
  const match = fullPath.match(/^\/(movie|series|anime)\/([^/?#]+)/);
  if (!match) {
    // Shouldn't happen — fall through to index.html
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  const slug         = match[2];
  const canonicalUrl = `${proto}://${host}${fullPath}`;

  // ── Real browser → serve the React SPA's index.html ──────────────────────
  if (!isBot(ua)) {
    try {
      // __dirname isn't available in ESM on Vercel; use process.cwd()
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      const html = readFileSync(indexPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        // Allow browsers to cache the SPA shell for 5 minutes; CDN for 10 minutes.
        // index.html itself has no dynamic content — the React app fetches data
        // client-side. Caching this avoids the cold-start penalty on every refresh.
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=60',
      });
      return res.end(html);
    } catch {
      // dist not built yet (local dev / CI) — let the caller handle it.
      // A redirect back to the same path would cause an infinite loop, so
      // return a minimal HTML stub that lets Vite handle the route instead.
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      return res.end('Build not found. Run `npm run build` in the client directory.');
    }
  }

  // ── Bot → fetch movie from DB and return OG HTML ──────────────────────────
  let movie = null;
  try {
    movie = await findMovie(slug);
  } catch (err) {
    console.error('[og.js] DB error:', err.message);
  }

  if (!movie) {
    const fallback = `<!doctype html><html><head>
  <title>CineVault — Download Movies, Series &amp; Anime</title>
  <meta property="og:title" content="CineVault — Download Movies, Series &amp; Anime" />
  <meta property="og:description" content="Browse and download movies, series and anime in HD quality." />
  <meta property="og:image" content="${proto}://${host}/og-image.png" />
</head><body></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fallback);
  }

  const title = movie.title || 'Unknown Title';
  const year  = movie.year ? ` (${movie.year})` : '';
  const desc  = movie.description
    ? movie.description.slice(0, 220).replace(/\n/g, ' ') + (movie.description.length > 220 ? '…' : '')
    : `Watch and download ${title} on CineVault in HD quality.`;

  const html = buildOgHtml({
    title: `${title}${year}`,
    description: desc,
    poster: movie.poster || '',
    url: canonicalUrl,
    type: movie.type || 'movie',
  });

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=600, s-maxage=600',
  });
  res.end(html);
}
