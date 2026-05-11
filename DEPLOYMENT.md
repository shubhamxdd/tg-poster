# 🚀 Vercel Serverless Deployment Guide

This project is configured as a Monorepo. Vercel will serve your React frontend as static files and your Express backend as Serverless Functions.

---

## 1. Database Setup (MongoDB Atlas)

1.  Create a cluster at [mongodb.com](https://www.mongodb.com/).
2.  **Network Access:** Add IP `0.0.0.0/0` (Allow all). **This is required for Vercel.**
3.  Copy your connection string.

---

## 2. Vercel Project Settings

1.  **Import** your GitHub repository.
2.  **Framework Preset:** Select **"Other"**. (Do not select Vite).
3.  **Root Directory:** `./`
4.  **Build & Development Settings:**
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
    *   **Install Command:** `npm install`
5.  **Environment Variables:**
    *   `NODE_ENV`: `production`
    *   `MONGO_URI`: `your_atlas_url`
    *   `BOT_TOKEN`: `your_bot_token`
    *   `OPENROUTER_API_KEY`: `your_key`
    *   `TMDB_API_KEY`: `your_key`
    *   `WEBHOOK_SECRET`: `your_random_secret`

---

## 3. Registering the Webhook

After deployment, copy your Vercel URL (e.g., `https://my-app.vercel.app`) and run this command:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_URL>/webhook&secret_token=<WEBHOOK_SECRET>"
```

*Make sure the `secret_token` matches the `WEBHOOK_SECRET` you set in Vercel.*

---

## 🔍 Common Deployment Fixes

### 404 on Refresh
If you refresh a page (like `/movie/123`) and get a 404, check `vercel.json`. It must have the rewrite rule to redirect all non-API requests to `index.html`.

### 500 Internal Server Error
Check the **Logs** tab in Vercel. 
*   **"SyntaxError: requested module..."**: Ensure `backend/server.js` has `export default app;`.
*   **"CORS error"**: Ensure `client/src/api/movieApi.ts` uses the relative path `/api` instead of `localhost`.
