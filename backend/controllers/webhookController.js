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

    // Support both regular messages and edited ones
    const { message, channel_post, edited_message, edited_channel_post } = req.body;
    const msg = message || channel_post || edited_message || edited_channel_post;

    if (!msg) {
      return res.status(200).send('No message content');
    }

    const text = msg.text || msg.caption || '';
    const msgId = msg.message_id;

    console.log(`Processing message ID: ${msgId}`);

    // 1. Parse message text with AI
    const movieData = await parseTelegramMessage(text);

    // 2. Check for existing entry (either by message ID or by Title+Year)
    let existingMovie = await Movie.findOne({ telegramMsgId: msgId });
    
    if (!existingMovie && movieData.title) {
      // Search by title and year (if year exists) to prevent duplicates across different messages
      const query = { title: movieData.title };
      if (movieData.year) query.year = movieData.year;
      existingMovie = await Movie.findOne(query);
    }

    // 3. Resolve Extra Details from TMDB (Only if it's a new movie or title changed)
    let tmdbDetails = {};
    if (!existingMovie || existingMovie.title !== movieData.title) {
      console.log(`[Webhook] Fetching details from TMDB for: ${movieData.title}`);
      tmdbDetails = await fetchFullDetailsFromTMDB(movieData.title, movieData.type, movieData.year);
    }

    // 4. Resolve Poster URL
    let posterUrl = movieData.poster;
    if (!posterUrl && msg.photo && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      posterUrl = await getTelegramFileUrl(largestPhoto.file_id);
    }
    if (!posterUrl || posterUrl === '') {
      posterUrl = tmdbDetails?.poster || existingMovie?.poster || '';
    }

    // 5. Merge and Save/Update
    const finalData = {
      ...tmdbDetails,
      ...movieData, // AI data from message takes priority
      poster: posterUrl,
      rawMessage: text,
      telegramMsgId: msgId,
    };

    if (existingMovie) {
      console.log(`[Webhook] Updating existing entry: ${existingMovie.title}`);
      await Movie.findByIdAndUpdate(existingMovie._id, finalData, { new: true });
      res.status(200).json({ success: true, action: 'updated', movie: existingMovie });
    } else {
      console.log(`[Webhook] Creating new entry: ${movieData.title}`);
      const newMovie = new Movie(finalData);
      await newMovie.save();
      res.status(200).json({ success: true, action: 'created', movie: newMovie });
    }

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
};
