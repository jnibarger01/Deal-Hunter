import { GoogleGenAI } from '@google/genai';
import config from '../config/env';

const MODEL = 'gemini-2.0-flash';

function getClient(): GoogleGenAI {
  if (!config.apiKeys.gemini) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: config.apiKeys.gemini });
}

export interface DealAnalysisInput {
  title: string;
  price: number;
  condition?: string | null;
  category: string;
  location?: string | null;
  tmv?: number | null;
  confidence?: number | null;
  profitMargin?: number | null;
  compositeRank?: number | null;
}

export interface DealAnalysis {
  verdict: 'strong buy' | 'buy' | 'fair deal' | 'avoid';
  summary: string;
  pros: string[];
  cons: string[];
  priceContext: string;
  resaleAdvice: string;
}

export async function analyzeDeal(input: DealAnalysisInput): Promise<DealAnalysis> {
  const ai = getClient();

  const prompt = buildPrompt(input);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });

  const text = response.text ?? '';
  const parsed = JSON.parse(text) as DealAnalysis;
  return parsed;
}

export async function generateMarketContext(
  category: string,
  keywords: string
): Promise<string> {
  const ai = getClient();

  const prompt = `You are a resale market expert. In 2-3 sentences, describe the current resale market conditions for "${keywords}" in the "${category}" category. Include typical profit margins, demand level, and any seasonal factors. Be concise and practical.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.4 },
  });

  return response.text ?? '';
}

function buildPrompt(input: DealAnalysisInput): string {
  const spread =
    input.tmv != null && input.price > 0
      ? `$${(input.tmv - input.price).toFixed(2)} potential profit (${(((input.tmv - input.price) / input.price) * 100).toFixed(1)}% margin)`
      : 'TMV not available';

  return `You are a professional resale deal analyst. Analyze the following deal and respond with JSON only.

Deal details:
- Title: ${input.title}
- Listed price: $${input.price}
- Condition: ${input.condition ?? 'Unknown'}
- Category: ${input.category}
- Location: ${input.location ?? 'Not specified'}
- True Market Value (TMV): ${input.tmv != null ? `$${input.tmv}` : 'Not calculated'}
- TMV confidence: ${input.confidence != null ? `${(input.confidence * 100).toFixed(0)}%` : 'N/A'}
- Estimated spread: ${spread}
- Deal score: ${input.compositeRank != null ? `${input.compositeRank.toFixed(1)}/100` : 'N/A'}

Return ONLY valid JSON matching this exact schema:
{
  "verdict": "strong buy" | "buy" | "fair deal" | "avoid",
  "summary": "1-2 sentence overall assessment",
  "pros": ["up to 3 reasons this is a good deal"],
  "cons": ["up to 3 risks or downsides"],
  "priceContext": "1 sentence explaining how the price compares to market",
  "resaleAdvice": "1-2 sentences on where/how to resell for best return"
}`;
}
