import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function callAI(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const provider = process.env.AI_PROVIDER || 'openai';

  try {
    switch (provider) {
      case 'openai': {
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        const messages: { role: 'system' | 'user'; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.3,
        });
        return response.choices[0]?.message?.content ?? '';
      }

      case 'openrouter': {
        const client = new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
        });
        const messages: { role: 'system' | 'user'; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        const response = await client.chat.completions.create({
          model: 'openai/gpt-4o-mini',
          messages,
          temperature: 0.3,
        });
        return response.choices[0]?.message?.content ?? '';
      }

      case 'gemini': {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const fullPrompt = systemPrompt
          ? `${systemPrompt}\n\n${prompt}`
          : prompt;
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
      }

      default:
        throw new Error(`AI_PROVIDER desconocido: ${provider}. Usa: openai, gemini, openrouter`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido al llamar a la IA';
    throw new Error(`Error en callAI (${provider}): ${message}`);
  }
}
