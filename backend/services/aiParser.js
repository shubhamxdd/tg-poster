import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const parseTelegramMessage = async (text) => {
  try {
    const prompt = `Extract the following fields from this Telegram message and return ONLY valid JSON:
{
  "title": "",
  "type": "movie | series | anime",
  "link": "",
  "poster": "",
  "genre": [],
  "year": null,
  "language": "",
  "description": ""
}

Message: ${text}`;

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0].message.content;
    
    // Find JSON block if it's wrapped in markdown (though response_format should handle it)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return parsedData;
  } catch (error) {
    console.error('Error parsing message with AI:', error);
    throw error;
  }
};
