# 🎬 Movie Catalog Website - Auto-synced from Telegram

A modern, fully automated movie and series catalog website that listens to a private Telegram channel, parses messages using AI, enriches metadata via TMDB, and displays everything on a sleek, high-end React frontend.

## 🚀 Key Features

-   **🤖 AI-Powered Parsing:** Uses Gemini 2.0 (via OpenRouter) to intelligently extract titles, seasons, qualities, and sizes from raw Telegram text.
-   **📱 Real-time Sync:** Supports new messages and **edits**. Update a post in Telegram, and the site updates instantly.
-   **🔄 Robust Deduplication:** Groups multiple posts (e.g., S01, S02) into a single entry using **TMDB ID** and title matching.
-   **🛡️ Secure Admin Panel:** Manage content (edit/delete) via a password-protected dashboard at `/admin`.
-   **🔍 Advanced Search & Filters:** Stackable filters for Type, Genre, and Search with multiple sorting options.
-   **✨ Sticky Control Bar:** A modern, scroll-responsive filter bar with Glassmorphism effects.
-   **📦 Season Tabs:** Automatically groups download links into interactive tabs by Season (Season 1, Season 2, etc.).
-   **🖼️ Metadata Enrichment:** Automatically pulls Cast (with photos), Directors, Ratings, Runtimes, and Posters from TMDB.
-   **🎨 Premium UI:** Built with React 19, Tailwind CSS, and **HeroUI** for a cinematic, responsive dark-mode experience.

## 🛠️ Tech Stack

-   **Frontend:** Vite, React 19, Tailwind CSS, **HeroUI**, Lucide React.
-   **Backend:** Node.js (ESM), Express, Mongoose.
-   **Infrastructure:** Vercel (Serverless), MongoDB Atlas (Cloud Database).
-   **AI:** Vercel AI SDK + OpenRouter.

## 📥 Local Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd movie-catalog
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    cd client && npm install
    cd ..
    ```

3.  **Environment Variables:**
    Create a `.env` in the root and fill in:
    ```env
    MONGO_URI=mongodb://localhost:27017/moviecatalog
    BOT_TOKEN=your_telegram_bot_token
    OPENROUTER_API_KEY=your_key
    TMDB_API_KEY=your_key
    WEBHOOK_SECRET=random_secret_string
    ADMIN_PASSWORD=your_admin_panel_password
    AI_MODEL=google/gemini-2.0-flash-001
    ```

4.  **Run Dev Mode:**
    -   Backend: `npm run dev` (starts on port 3000)
    -   Frontend: `cd client && npm run dev` (starts on port 5173)

## 🌐 Deployment

This app is optimized for **Vercel Serverless**. 
Please refer to the detailed [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step hosting instructions.

## 🧠 System Architecture

For a deep dive into how the AI parsing and webhook logic works, see [HOW_IT_WORKS.md](./HOW_IT_WORKS.md).

---
*Developed in May 2026*
