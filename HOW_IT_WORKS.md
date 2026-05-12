# 🧠 How It Works: System Architecture

This document explains the technical flow of data from your Telegram channel to the live website.

---

### 1. Data Intake (The Webhook)
When you post or edit a message in your Telegram channel, Telegram sends an **HTTPS POST** request to your server's `/webhook` endpoint.

*   **Security:** The `verifyTelegramToken` middleware checks the `x-telegram-bot-api-secret-token` header to ensure the request actually came from Telegram.
*   **Identification:** The `webhookController` identifies if the message is new or an edit using the `message_id`.

---

### 2. AI Parsing (Gemini 2.0 via OpenRouter)
The raw Telegram text (which is often messy with dots and tags) is sent to the **AI Parser Service**.

*   **Logic:** The AI is instructed to extract:
    *   **Clean Title:** (e.g., "Dexter" instead of "Dexter.S01.E01.1080p")
    *   **Links:** It finds all URLs and maps them to seasons, sizes, and languages.
    *   **Metadata:** It infers the type (movie/series), year, and status.
*   **Normalization:** The parser automatically adds `https://` to domains like `google.com` to ensure they are valid absolute links.

---

### 3. Metadata Enrichment (TMDB)
To make the site look like Netflix, the backend uses the **TMDB Service**.

*   **Search:** It searches TMDB using the cleaned title and year.
*   **Data Fetching:** It retrieves:
    *   High-resolution **Posters** and **Backdrops**.
    *   **Top 10 Cast** members (names, characters, and profile photos).
    *   **Director** and **Rating**.
    *   Plot summaries and runtimes.

---

### 4. Database & Deduplication (MongoDB)
The system prevents duplicate entries to keep the catalog clean.

*   **Check 1:** It looks for an existing entry with the same `telegramMsgId`.
*   **Check 2:** It looks for an existing entry with the same `Title` and `Year`.
*   **Action:** If found, it **Updates** the record with new links/info. If not, it **Creates** a new record.

---

### 5. Frontend Rendering (React 19 + HeroUI)
The user sees the data via a high-performance frontend.

*   **Slug System:** For better SEO and cleaner URLs, the app uses a slug format: `title-year-id`. This allows users to share readable links like `/movie/inception-2010-abc123`.
*   **UI Framework:** Powered by **HeroUI**, the app features a responsive, cinematic layout with animated loading spinners, hover effects, and modern avatars for the cast.
*   **Season Grouping:** On the detail page, a `useMemo` hook instantly groups the links into Tabs by Season number.
*   **Proxy:** During local development, `vite.config.ts` uses a proxy to forward requests to the local Node.js server.

---

### 6. Deployment (Vercel Monorepo)
The app runs as a unified monorepo on Vercel.

*   **Bridge:** `api/index.js` acts as a bridge, importing the Express app into Vercel's serverless environment.
*   **Manual Build:** The root `package.json` build script compiles the React app and moves it to the root `dist` folder, ensuring Vercel serves the entire site from a single output directory while maintaining API access.

---
*Generated: May 2026*
