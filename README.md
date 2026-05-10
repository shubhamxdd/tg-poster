# 🎬 Movie Catalog Website - Auto-synced from Telegram

A modern, fully automated movie and series catalog website that listens to a private Telegram channel, parses messages using AI, enriches metadata via TMDB, and displays everything on a sleek, Netflix-style React frontend.

![Frontend Preview](https://via.placeholder.com/1200x600?text=Modern+Movie+Catalog+UI+Preview)

## 🚀 Features

-   **🤖 AI-Powered Parsing:** Uses OpenRouter (Gemini/Claude) to extract structured data (titles, seasons, qualities, sizes) from unstructured Telegram messages.
-   **📱 Telegram Webhook (Edits Support):** Real-time synchronization. Supports message edits—if you update a post in Telegram, it updates on the site instantly.
-   **🔄 Smart Deduplication:** Automatically detects if a show already exists (via Title + Year) and updates the existing entry instead of creating duplicates.
-   **📦 Tabbed Season Organization:** Intelligently groups download links into interactive tabs by Season (e.g., Season 1, Season 2).
-   **💾 Detailed File Metadata:** Displays full filenames, file sizes, resolutions (1080p/4k), and audio languages for every link.
-   **🖼️ Smart Poster Handling:** Fetches high-resolution posters from TMDB or uses directly attached Telegram photos.
-   **✨ Full Metadata Enrichment:** Automatically pulls Top Cast (with photos), Directors, Ratings, Runtimes, and Status from TMDB.
-   **🎨 Premium UI:** Built with Vite, React 19, Tailwind CSS, and Shadcn UI for a modern, dark-themed experience.

## 🛠️ Tech Stack

-   **Frontend:** React 19, Vite, Tailwind CSS, Shadcn UI, Lucide React.
-   **Backend:** Node.js, Express, Mongoose (MongoDB).
-   **AI Engine:** Vercel AI SDK + OpenRouter.
-   **External APIs:** Telegram Bot API, TMDB API.

## 📋 Prerequisites

-   Node.js (v18+)
-   MongoDB (Local or Atlas)
-   Telegram Bot Token (from [@BotFather](https://t.me/botfather))
-   OpenRouter API Key (for Gemini/Claude parsing)
-   TMDB API Key (for metadata and posters)

## 📥 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/movie-catalog.git
    cd movie-catalog
    ```

2.  **Install Backend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd client
    npm install
    ```

## ⚙️ Configuration

Create a `.env` file in the root directory and fill in your credentials:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/moviecatalog
BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=google/gemini-2.0-flash-001
TMDB_API_KEY=your_tmdb_api_key
WEBHOOK_SECRET=your_random_secret_string
```

## 🚀 Running the App

1.  **Start the Backend (from root):**
    ```bash
    npm run dev
    ```

2.  **Start the Frontend (from client directory):**
    ```bash
    cd client
    npm run dev
    ```

3.  **Setup Telegram Webhook:**
    Expose your local server (e.g., using `ngrok`) and register the webhook:
    ```bash
    curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_URL>/webhook&secret_token=<WEBHOOK_SECRET>"
    ```

## 📂 Project Structure

```text
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Webhook logic (Updates & Deduplication)
│   ├── models/          # Mongoose Schema (Structured Links & Cast)
│   ├── routes/          # Express API routes
│   ├── services/        # AI Parser (Vercel AI SDK) & TMDB integration
│   └── server.js        # Entry point
├── client/              # Vite + React Frontend
│   ├── src/
│   │   ├── api/         # Axios API calls
│   │   ├── components/  # Shadcn UI & Custom Navbar
│   │   ├── pages/       # Home & Season-Tabbed Detail pages
│   │   └── types/       # TypeScript definitions
├── PLAN.md              # Original project roadmap
└── README.md            # Updated Documentation
```

## 🤝 Contributing

Feel free to fork this project and submit PRs for any improvements or new features!

---
*Developed with ❤️ in May 2026*
