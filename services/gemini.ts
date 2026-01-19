
import { GoogleGenAI, Type } from "@google/genai";
import { Deal, RepairInsight, NegotiationScript } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeDealForRepair = async (deal: Deal): Promise<RepairInsight> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this marketplace listing for repair difficulty and potential profit. 
    Title: ${deal.title}
    Price: $${deal.price}
    Category: ${deal.category}
    Description: ${deal.description}
    Condition: ${deal.condition}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          difficulty: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced'] },
          likelyIssue: { type: Type.STRING },
          partsCostEst: { type: Type.STRING },
          resalePotential: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ['difficulty', 'likelyIssue', 'partsCostEst', 'resalePotential', 'summary']
      }
    }
  });

  return JSON.parse(response.text || '{}') as RepairInsight;
};

export const generateNegotiationStrategy = async (deal: Deal): Promise<NegotiationScript> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a negotiation script for this deal. The user wants to flip it. 
    Target a price that leaves room for at least 30% margin. 
    Listing: ${deal.title} - $${deal.price} on ${deal.marketplace}.
    Description snippet: ${deal.description.substring(0, 100)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          approach: { type: Type.STRING, description: 'The psychological approach (e.g., cash today, pointing out flaws)' },
          opening: { type: Type.STRING, description: 'First message text' },
          lowballBuffer: { type: Type.STRING, description: 'Secondary offer if they say no' },
          closing: { type: Type.STRING, description: 'Closing call to action' },
          suggestedOffer: { type: Type.NUMBER, description: 'Recommended starting offer price' }
        },
        required: ['approach', 'opening', 'lowballBuffer', 'closing', 'suggestedOffer']
      }
    }
  });

  return JSON.parse(response.text || '{}') as NegotiationScript;
};

export const getPriceTrend = async (title: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a quick 2-sentence summary of the current resale market trend for: "${title}". Is it hot, cooling, or stable?`,
    });
    return response.text || 'No data available.';
}
