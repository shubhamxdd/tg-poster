import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import dotenv from 'dotenv';

dotenv.config();

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || 'test',
});

const modelId = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
console.log('Model ID:', modelId);
const model = openrouter.chat(modelId);
console.log('Model object (using .chat):', model);
console.log('Specification Version:', model?.specificationVersion);
