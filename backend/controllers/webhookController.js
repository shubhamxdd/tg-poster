import axios from 'axios';
import { parseTelegramMessage } from '../services/aiParser.js';
import { fetchFullDetailsFromTMDB } from '../services/tmdbService.js';
import Movie from '../models/Movie.js';

const getTelegramFileUrl = async (fileId) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`);
    if (response.data.ok) {
      const filePath = response.data.result.file_path;
      return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    }
    return null;
  } catch (error) {
    console.error('Error getting Telegram file URL:', error);
    return null;
  }
};

export const handleTelegramWebhook = async (req, res) => {
  try {
    console.log('--- New Update from Telegram ---');
    console.log(JSON.stringify(req.body, null, 2));

    const { message, channel_post } = req.body;
    const msg = message || channel_post;

    if (!msg) {
      return res.status(200).send('No message content');
    }

    const text = msg.text || msg.caption || '';
    const msgId = msg.message_id;

    console.log(`Processing message ID: ${msgId}`);

    // 1. Parse message text with AI
    const movieData = await parseTelegramMessage(text);

    // 2. Resolve Extra Details from TMDB
    console.log(`[Webhook] Fetching details from TMDB for: ${movieData.title}`);
    const tmdbDetails = await fetchFullDetailsFromTMDB(movieData.title, movieData.type, movieData.year);

    // 3. Resolve Poster URL (Telegram has priority if attached)
    let posterUrl = movieData.poster;

    if (!posterUrl && msg.photo && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      posterUrl = await getTelegramFileUrl(largestPhoto.file_id);
    }

    // If still no poster from TG, use TMDB
    if (!posterUrl || posterUrl === '') {
      posterUrl = tmdbDetails?.poster || '';
    }

    // 4. Merge Data (AI data from message takes priority for specific fields)
    const mergedData = {
      ...tmdbDetails,
      ...movieData, // Overwrite with AI data if present in message
      poster: posterUrl,
      rawMessage: text,
      telegramMsgId: msgId,
    };

    // Special logic: If AI returned 'Unknown' or 'N/A' for fields, use TMDB instead
    if (movieData.language === 'Unknown' && tmdbDetails?.language) mergedData.language = tmdbDetails.language;
    if (movieData.director === 'N/A' && tmdbDetails?.director) mergedData.director = tmdbDetails.director;
    if (movieData.genre.length === 0 && tmdbDetails?.genre) mergedData.genre = tmdbDetails.genre;
    if (!movieData.year && tmdbDetails?.year) mergedData.year = tmdbDetails.year;

    // 5. Save to Database
    const newMovie = new Movie(mergedData);
    await newMovie.save();

    console.log(`Saved movie: ${newMovie.title} with full metadata.`);
    res.status(200).json({ success: true, movie: newMovie });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
};
