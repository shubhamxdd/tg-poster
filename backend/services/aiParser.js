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
2. Links: Identify ALL download/streaming links. Create a descriptive label for each by looking at the surrounding text or the filename (e.g., "Season 1 [1080p]", "Hindi Dubbed", "Direct GDrive").
3. Metadata: Look for "Director", "Language", "Year", "Status", and "Genre" keywords in the message.
4. If a piece of information is not explicitly in the message, try to infer it from the filename/tags, otherwise return null.

Return ONLY a valid JSON object.

Required JSON Structure:
{
  "title": "Cleaned Name",
  "type": "movie" | "series" | "anime",
  "links": [
    { "label": "Descriptive Label (e.g. S01 1080p)", "url": "url1" },
    { "label": "Descriptive Label (e.g. S02 720p)", "url": "url2" }
  ],
  "genre": ["Genre1", "Genre2"],
  "year": 2024,
  "language": "English / Hindi / Dual Audio",
  "director": "Director Name",
  "status": "Ongoing / Ended / Released",
  "description": "Short summary or plot if mentioned"
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

    // Ensure links are objects { label, url } and capture quality/season info
    let formattedLinks = [];
    if (Array.isArray(movieData.links)) {
      formattedLinks = movieData.links.map(l => {
        if (typeof l === 'string') return { label: 'Download', url: l };
        return { label: l.label || 'Download', url: l.url || '' };
      }).filter(l => l.url);
    } else if (movieData.link) {
      formattedLinks = [{ label: 'Download', url: movieData.link }];
    }

    return {
      title: movieData.title || 'Unknown Title',
      type: ['movie', 'series', 'anime'].includes(movieData.type) ? movieData.type : 'movie',
      links: formattedLinks,
      link: formattedLinks[0]?.url || '', 
      genre: Array.isArray(movieData.genre) ? movieData.genre : [],
      year: Number(movieData.year) || null,
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
