# 🚀 Vercel Serverless Deployment Guide

This project is configured as a Monorepo. Vercel will serve your React frontend as static files and your Express backend as Serverless Functions.

---

## 1. Database Setup (MongoDB Atlas)

1.  Create a cluster at [mongodb.com](https://www.mongodb.com/).
2.  **Network Access:** Add IP `0.0.0.0/0` (Allow all). **This is required for Vercel.**
3.  Copy your connection string and add it to your environment variables as `MONGO_URI`.

---

## 2. Vercel Project Settings

1.  **Import** your GitHub repository into Vercel.
2.  **Framework Preset:** Select **"Other"**. 
3.  **Root Directory:** `./` (the default root).
4.  **Build & Development Settings:**
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
    *   **Install Command:** `npm install`
5.  **Environment Variables:** Add the following to Vercel's project settings:

| Variable | Description |
| :--- | :--- |
| `NODE_ENV` | Must be `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `BOT_TOKEN` | Your Telegram Bot Token from @BotFather |
| `OPENROUTER_API_KEY` | Your OpenRouter API Key |
| `TMDB_API_KEY` | Your TMDB (TheMovieDB) API Key |
| `WEBHOOK_SECRET` | A random secret string for security |
| `AI_MODEL` | Set to `google/gemini-2.0-flash-001` (recommended) |

---

## 3. Registering the Webhook

After Vercel finishes deploying, copy your production URL (e.g., `https://my-catalog.vercel.app`) and run this command:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_URL>/webhook&secret_token=<YOUR_WEBHOOK_SECRET>"
```

*Note: Ensure the `secret_token` in the URL matches the `WEBHOOK_SECRET` you set in Vercel.*

---

## 🔍 Common Deployment Fixes

### 404 on Refresh
The `vercel.json` rewrite rule is already set up to redirect all non-API requests back to `index.html`. This ensures React Router works correctly on Vercel.

### 500 Internal Server Error
Check the **Logs** tab in Vercel. 
*   **"SyntaxError"**: Ensure `backend/server.js` has `export default app;`.
*   **"CORS error"**: The app is pre-configured to use relative paths (`/api`) in production.

---
*Last Updated: May 2026*
