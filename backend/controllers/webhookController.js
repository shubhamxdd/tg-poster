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

/**
 * Priority 1: Detect language from raw text/filenames
 */
const detectLanguage = (text) => {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('hindi & english') || t.includes('hindi + english') || (t.includes('hindi') && t.includes('english'))) return 'Hindi & English';
  if (t.includes('dual audio') || t.includes('multi audio')) return 'Hindi & English';
  if (t.includes('hindi')) return 'Hindi';
  if (t.includes('english')) return 'English';
  if (t.includes('tamil')) return 'Tamil';
  if (t.includes('telugu')) return 'Telugu';
  return null;
};

export const handleTelegramWebhook = async (req, res) => {
  try {
    console.log('--- [Webhook] Incoming Request ---');
    const { message, channel_post, edited_message, edited_channel_post } = req.body;
    const msg = message || channel_post || edited_message || edited_channel_post;

    if (!msg) return res.status(200).send('No message content');

    const text = msg.text || msg.caption || '';
    const msgId = msg.message_id;
    console.log(`[Webhook] MsgID: ${msgId} | Text snippet: ${text.substring(0, 50)}...`);

    // 1. AI Parse
    const movieData = await parseTelegramMessage(text);
    console.log(`[AI Result] Title: "${movieData.title}" | Links found: ${movieData.links?.length}`);

    // 2. TMDB Fetch (Essential for grouping)
    console.log(`[TMDB] Searching for: ${movieData.title}`);
    const tmdbDetails = await fetchFullDetailsFromTMDB(movieData.title, movieData.type, movieData.year);
    if (tmdbDetails) console.log(`[TMDB] Found! ID: ${tmdbDetails.tmdbId} | Real Title: ${tmdbDetails.title || movieData.title} | Description: ${tmdbDetails.description ? 'YES (' + tmdbDetails.description.substring(0, 40) + '...)' : 'MISSING'}`);

    // 3. Find Existing Movie
    let existingMovie = await Movie.findOne({ telegramMsgId: msgId });
    if (existingMovie) {
      console.log(`[Webhook] Found existing by MsgID: ${existingMovie._id}`);
    } else if (tmdbDetails?.tmdbId) {
      existingMovie = await Movie.findOne({ tmdbId: tmdbDetails.tmdbId });
      if (existingMovie) console.log(`[Webhook] Found existing by TMDB ID: ${existingMovie._id} (${existingMovie.title})`);
    } else if (movieData.title) {
      const query = { title: movieData.title };
      if (movieData.year) query.year = movieData.year;
      existingMovie = await Movie.findOne(query);
      if (existingMovie) console.log(`[Webhook] Found existing by Title+Year: ${existingMovie._id}`);
    }

    // 4. Resolve Metadata
    const filenameLang = detectLanguage(text);
    const finalLanguage = filenameLang || movieData.language || tmdbDetails?.language || existingMovie?.language || 'Unknown';
    
    let posterUrl = movieData.poster;
    if (!posterUrl && msg.photo?.length > 0) {
      posterUrl = await getTelegramFileUrl(msg.photo[msg.photo.length - 1].file_id);
    }
    posterUrl = posterUrl || tmdbDetails?.poster || existingMovie?.poster || '';

    // 5. Merge Strategy
    const tmdbOwned = ['genre', 'director', 'cast', 'rating', 'runtime', 'status', 'backdrop', 'country', 'year', 'originalTitle'];
    const cleanMovieData = Object.fromEntries(
      Object.entries(movieData).filter(([key, v]) => {
        if (tmdbOwned.includes(key) && tmdbDetails?.[key] != null) return false;
        if (v === null || v === undefined || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    );

    const mergedData = {
      ...cleanMovieData,
      ...tmdbDetails,
      language: finalLanguage,
      poster: posterUrl,
      rawMessage: text,
      telegramMsgId: msgId,
    };

    // Always use TMDB overview as description — no fallbacks, no conditions
    if (tmdbDetails?.description) {
      mergedData.description = tmdbDetails.description;
    }

    if (existingMovie) {
      console.log(`[Webhook] Merging into existing movie: ${existingMovie.title}`);
      
      // Preserve core identity to avoid "Season 2" overwriting main show name
      mergedData.title = existingMovie.title;
      mergedData.type = existingMovie.type;
      mergedData.tmdbId = existingMovie.tmdbId || tmdbDetails?.tmdbId;
      // Always update originalTitle from TMDB if available
      if (tmdbDetails?.originalTitle) mergedData.originalTitle = tmdbDetails.originalTitle;

      // Merge Links surgery - handle separately from .set()
      const currentLinks = existingMovie.links || [];
      const incomingLinks = mergedData.links || [];
      
      console.log(`[Webhook] Link count before: ${currentLinks.length} | Incoming links: ${incomingLinks.length}`);
      
      const uniqueNewLinks = incomingLinks.filter(nLink => 
        !currentLinks.some(cLink => cLink.url === nLink.url)
      );
      console.log(`[Webhook] New unique links to add: ${uniqueNewLinks.length}`);

      // REMOVE links from mergedData so .set() doesn't overwrite the existing array
      delete mergedData.links;

      // Apply metadata updates
      existingMovie.set(mergedData);
      
      // Manually append unique links to the existing array
      if (uniqueNewLinks.length > 0) {
        uniqueNewLinks.forEach(link => existingMovie.links.push(link));
      }

      await existingMovie.save();
      console.log(`[Webhook] Successfully UPDATED: ${existingMovie.title} (Total links: ${existingMovie.links.length})`);
      res.status(200).json({ success: true, action: 'updated', movie: existingMovie });
    } else {
      console.log(`[Webhook] Creating NEW entry: ${movieData.title}`);
      // Use TMDB's clean title for new entries if available
      if (tmdbDetails?.title) mergedData.title = tmdbDetails.title;
      const newMovie = new Movie(mergedData);
      await newMovie.save();
      console.log(`[Webhook] Successfully CREATED: ${newMovie.title}`);
      res.status(200).json({ success: true, action: 'created', movie: newMovie });
    }

  } catch (error) {
    console.error('--- [Webhook Error] ---');
    console.error(error);
    res.status(200).json({ success: false, error: error.message });
  }
};
