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
1. Title: Clean it (remove dots, years, resolution tags).
2. Links: Identify ALL download/streaming links. 
   - Extract the FULL filename line associated with the link.
   - Links might NOT have http:// prefix (e.g. reddit.com). YOU MUST ADD "https://" if it is missing.
   - Ensure the "url" is an ABSOLUTE URL starting with http:// or https://.
   - Extract "quality" (e.g. 1080p, 4k).
   - Extract "size" (e.g. 1.2GB, 500MB).
   - Extract "language" (e.g. Hindi, English).
   - Extract "season" number if applicable.
   - Create a "label" like "Season 1 [1080p]" or "Movie [Hindi]".
3. Metadata: Look for "Director", "Language", "Year", "Status", and "Genre".
4. Infer missing info from filenames/tags.

Return ONLY a valid JSON object.

Required JSON Structure:
{
  "title": "Cleaned Name",
  "type": "movie" | "series" | "anime",
  "links": [
    { 
      "label": "S01 [1080p]", 
      "url": "url1", 
      "quality": "1080p", 
      "size": "19.76GB", 
      "language": "Hindi", 
      "season": 1,
      "filename": "My.Dress-Up.Darling.S01.1080p.CR.WEB-DL..."
    }
  ],
  "genre": ["Genre1"],
  "year": 2024,
  "language": "Language",
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
      genre: Array.isArray(movieData.genre) ? movieData.genre : [],
      year: cleanedYear,
      language: movieData.language || 'Unknown',
      director: movieData.director || 'N/A',
      status: movieData.status || 'Released',
      description: movieData.description || ''
    };
  } catch (error) {
    console.error('[AI Parser] Error:', error.message);
    throw error;
  }
};
