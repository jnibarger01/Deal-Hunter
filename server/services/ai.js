import { GoogleGenerativeAI } from '@google/genai';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getText = (response) => {
  if (!response) return '';
  if (typeof response.text === 'function') return response.text();
  return response.text || '';
};

const { SchemaType } = require("@google/genai");

export const summarize = async (req, res) => {
  const { title, description } = req.body;
  const r = await client.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Summarize and extract key details for a potential flipper:\n${title}\n${description}` }] }]
  });
  res.json({ result: getText(r) });
};

export const redflags = async (req, res) => {
  const { title, description, sellerText, price, platform } = req.body;
  const r = await client.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `List red flags or scam indicators for this listing:\nTitle: ${title}\nDescription: ${description}\nSeller: ${sellerText || ''}\nPrice: ${price || 'N/A'}\nPlatform: ${platform || 'Unknown'}`
      }]
    }]
  });
  res.json({ result: getText(r) });
};

export const negotiate = async (req, res) => {
  const { title, description, askingPrice, targetPrice, tone } = req.body;

  const response = await client.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `Generate a negotiation script for this deal. The user wants to flip it. 
            Target a price that leaves room for at least 30% margin. 
            Listing: ${title} - $${askingPrice || 'N/A'}.
            Description snippet: ${(description || '').substring(0, 100)}`
      }]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          approach: { type: SchemaType.STRING, description: 'The psychological approach (e.g., cash today, pointing out flaws)' },
          opening: { type: SchemaType.STRING, description: 'First message text' },
          lowballBuffer: { type: SchemaType.STRING, description: 'Secondary offer if they say no' },
          closing: { type: SchemaType.STRING, description: 'Closing call to action' },
          suggestedOffer: { type: SchemaType.NUMBER, description: 'Recommended starting offer price' }
        },
        required: ['approach', 'opening', 'lowballBuffer', 'closing', 'suggestedOffer']
      }
    }
  });

  const parsed = JSON.parse(getText(response) || '{}');
  res.json(parsed);
};

export const repairHints = async (req, res) => {
  const { title, description, symptoms, itemType } = req.body;

  const response = await client.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `Analyze this marketplace listing for repair difficulty and potential profit.
            Title: ${title}
            Description: ${description}
            Symptoms/Condition: ${symptoms || 'Unknown'}`
      }]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          difficulty: { type: SchemaType.STRING, enum: ['Beginner', 'Intermediate', 'Advanced'] },
          likelyIssue: { type: SchemaType.STRING },
          partsCostEst: { type: SchemaType.STRING },
          resalePotential: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING }
        },
        required: ['difficulty', 'likelyIssue', 'partsCostEst', 'resalePotential', 'summary']
      }
    }
  });

  const parsed = JSON.parse(getText(response) || '{}');
  res.json(parsed);
};
