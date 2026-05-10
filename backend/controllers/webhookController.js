import { parseTelegramMessage } from '../services/aiParser.js';
import Movie from '../models/Movie.js';

export const handleTelegramWebhook = async (req, res) => {
  try {
    const { message, channel_post } = req.body;
    const msg = message || channel_post;

    if (!msg || (!msg.text && !msg.caption)) {
      return res.status(200).send('No text to process');
    }

    const text = msg.text || msg.caption;
    const msgId = msg.message_id;

    console.log(`Processing message ID: ${msgId}`);

    // Parse with Claude
    const movieData = await parseTelegramMessage(text);

    // Add metadata
    const newMovie = new Movie({
      ...movieData,
      rawMessage: text,
      telegramMsgId: msgId,
    });

    await newMovie.save();

    console.log(`Saved movie: ${newMovie.title}`);
    res.status(200).json({ success: true, movie: newMovie });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Return 200 to Telegram to avoid retries, but log the error
    res.status(200).json({ success: false, error: error.message });
  }
};
