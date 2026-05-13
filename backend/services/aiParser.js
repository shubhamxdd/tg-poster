import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AI Parser Service
 * Uses OpenRouter + Vercel AI SDK to extract movie data from Telegram messages.
 */
export const parseTelegramMessage = async (text) => {
  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const modelId = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
    const model = openrouter.chat(modelId);

    const prompt = `You are an expert movie data extractor. 
Extract every possible detail from the Telegram message provided below. 

GUIDELINES:
1. Title: Clean it (remove dots, years, resolution tags, and season/episode tags like S01, S02, Season 1, Episode 1).
2. Links: Identify ALL download/streaming links. 
   - Extract the FULL filename line associated with the link.
   - Links might NOT have http:// prefix (e.g. reddit.com). YOU MUST ADD "https://" if it is missing.
   - Ensure the "url" is an ABSOLUTE URL starting with http:// or https://.
   - Extract "quality" (e.g. 1080p, 4k).
   - Extract "size" (e.g. 1.2GB, 500MB).
   - Extract "language" (e.g. Hindi, English).
   - Extract "season" number if applicable.
   - Extract "episode" number if the link is for a specific episode (e.g. E01, Episode 1, Ep1). If the link covers a full season leave episode as null.
   - Create a CLEAN "label" with ONLY the season/episode identifier — no quality, no tags, no brackets. For episode-wise: use "S01E01" (e.g. "S02E05"). For full season: use "Season 1". For movie: use "Movie".
3. Metadata: Look for "Director", "Language", "Year", "Status", and "Genre".
4. Audio: If message has "Audio:", "Language:", or similar with multiple languages (e.g. "Hindi, English & Tamil"), extract ALL of them into the "audio" array (e.g. ["Hindi", "English", "Tamil"]). The "language" field should be the primary/original language only.
5. Infer missing info from filenames/tags.

Return ONLY a valid JSON object.

Required JSON Structure:
{
  "title": "Cleaned Name",
  "type": "movie" | "series" | "anime",
  "links": [
    { 
      "label": "S01E01", 
      "url": "url1", 
      "quality": "1080p", 
      "size": "19.76GB", 
      "language": "Hindi", 
      "season": 1,
      "episode": 1,
      "filename": "My.Dress-Up.Darling.S01E01.1080p.CR.WEB-DL..."
    }
  ],
  "genre": ["Genre1"],
  "year": 2024,
  "language": "Language",
  "audio": ["Hindi", "English", "Tamil"],
  "director": "Director Name",
  "status": "Ongoing / Ended",
  "description": "Summary"
}

Telegram Message:
"${text}"`;

    const { text: responseBody } = await generateText({
      model: model,
      prompt: prompt,
    });

    const cleanedJson = responseBody.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIdx = cleanedJson.indexOf('{');
    const endIdx = cleanedJson.lastIndexOf('}');

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('AI response did not contain a valid JSON object.');
    }

    const movieData = JSON.parse(cleanedJson.substring(startIdx, endIdx + 1));

    // Cleanup links
    let formattedLinks = [];
    if (Array.isArray(movieData.links)) {
      formattedLinks = movieData.links.map(l => ({
        label: l.label || 'Download',
        url: l.url || (typeof l === 'string' ? l : ''),
        quality: l.quality || '',
        size: l.size || '',
        language: l.language || '',
        season: Number(l.season) || null,
        episode: Number(l.episode) || null,
        filename: l.filename || ''
      })).filter(l => l.url);
    }

    // Clean year
    let rawYear = movieData.year;
    let cleanedYear = null;
    if (rawYear) {
      const yearMatch = String(rawYear).match(/\d{4}/);
      if (yearMatch) cleanedYear = Number(yearMatch[0]);
    }

    return {
      title: movieData.title || 'Unknown Title',
      type: ['movie', 'series', 'anime'].includes(movieData.type) ? movieData.type : 'movie',
      links: formattedLinks,
      link: formattedLinks[0]?.url || '', 
      genre: Array.isArray(movieData.genre) && movieData.genre.length > 0 ? movieData.genre : [],
      year: cleanedYear,
      language: movieData.language && movieData.language !== 'Unknown' ? movieData.language : '',
      director: movieData.director && movieData.director !== 'N/A' && movieData.director !== 'Unknown' ? movieData.director : '',
      status: movieData.status && movieData.status !== 'Unknown' ? movieData.status : '',
      description: (movieData.description && movieData.description !== 'Summary') ? movieData.description : '',
      audio: Array.isArray(movieData.audio) && movieData.audio.length > 0 ? movieData.audio : [],
    };
  } catch (error) {
    console.error('[AI Parser] Error:', error.message);
    throw error;
  }
};
