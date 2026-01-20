import { z } from 'zod';

export const schemas = {
  summarize: z.object({
    title: z.string(),
    description: z.string(),
    price: z.number().optional(),
    condition: z.string().optional(),
    platform: z.string().optional(),
    url: z.string().url().optional()
  }),
  redflags: z.object({
    title: z.string(),
    description: z.string(),
    sellerText: z.string().optional(),
    price: z.number().optional(),
    platform: z.string().optional()
  }),
  negotiate: z.object({
    title: z.string(),
    description: z.string(),
    askingPrice: z.number(),
    targetPrice: z.number().optional(),
    tone: z.enum(['direct', 'friendly', 'firm']).optional()
  }),
  repairHints: z.object({
    title: z.string(),
    description: z.string(),
    symptoms: z.string().optional(),
    itemType: z.string().optional()
  })
};
