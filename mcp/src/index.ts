#!/usr/bin/env node

import cors from 'cors';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:5000/api/v1';
const DEFAULT_HTTP_PORT = 3333;
const RESPONSE_CHARACTER_LIMIT = 24000;

type JsonObject = Record<string, unknown>;

const dealStatusSchema = z.enum(['active', 'sold', 'expired']);
const sortBySchema = z.enum(['createdAt', 'price']);
const sortOrderSchema = z.enum(['asc', 'desc']);

const getApiBaseUrl = () => {
  const configured = process.env.DEAL_HUNTER_API_BASE_URL?.trim();
  return (configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL).replace(/\/$/, '');
};

const getServerBaseUrl = () => {
  const configured = process.env.DEAL_HUNTER_SERVER_BASE_URL?.trim();
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, '');
  }

  const apiUrl = new URL(getApiBaseUrl());
  return `${apiUrl.protocol}//${apiUrl.host}`;
};

const buildUrl = (path: string, query?: JsonObject) => {
  const url = new URL(path, `${getApiBaseUrl()}/`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
};

const truncate = (text: string) => {
  if (text.length <= RESPONSE_CHARACTER_LIMIT) {
    return text;
  }

  return `${text.slice(0, RESPONSE_CHARACTER_LIMIT)}\n\n[truncated: response exceeded ${RESPONSE_CHARACTER_LIMIT} characters]`;
};

const asToolResult = (data: unknown) => {
  const text = truncate(JSON.stringify(data, null, 2));
  const structuredContent =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as { [key: string]: unknown })
      : { result: data };

  return {
    content: [{ type: 'text' as const, text }],
    structuredContent,
  };
};

const asToolError = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

const readJson = async (url: URL): Promise<unknown> => {
  let response: globalThis.Response;

  try {
    response = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach Deal Hunter at ${url.origin}. Start the API or set DEAL_HUNTER_API_BASE_URL. ${detail}`
    );
  }

  const text = await response.text();
  const body = text.length > 0 ? safeParseJson(text) : undefined;

  if (!response.ok) {
    throw new Error(
      `Deal Hunter returned HTTP ${response.status} for ${url.pathname}. ${formatErrorBody(body ?? text)}`
    );
  }

  return body;
};

const safeParseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const formatErrorBody = (body: unknown) => {
  if (typeof body === 'string') {
    return body;
  }

  if (body && typeof body === 'object') {
    return JSON.stringify(body);
  }

  return 'No response body was returned.';
};

const registerDealHunterTools = (server: McpServer) => {
  server.registerTool(
    'deal_hunter_health',
    {
      title: 'Deal Hunter Health',
      description: 'Use this when you need to verify whether the Deal Hunter API is reachable before querying deals.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const data = await readJson(new URL('/health', `${getServerBaseUrl()}/`));
        return asToolResult(data);
      } catch (error) {
        return asToolError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  server.registerTool(
    'deal_hunter_search_deals',
    {
      title: 'Search Deal Hunter Deals',
      description:
        'Use this to find Deal Hunter listings by search text, category, marketplace, price cap, score threshold, status, pagination, and sort order.',
      inputSchema: {
        search: z.string().trim().min(1).max(120).optional().describe('Free-text listing search, such as "macbook" or "camera".'),
        category: z.string().trim().min(1).max(80).optional().describe('Deal category filter. Use deal_hunter_get_taxonomy first if unsure.'),
        marketplace: z.string().trim().min(1).max(80).optional().describe('Marketplace/source filter, such as ebay, craigslist, or facebook.'),
        status: dealStatusSchema.optional().describe('Deal lifecycle status. Defaults to the API behavior when omitted.'),
        maxPrice: z.number().min(0).optional().describe('Maximum listing price.'),
        minDealScore: z.number().min(0).optional().describe('Minimum deal score if present in the API data.'),
        page: z.number().int().min(1).default(1).describe('One-based result page.'),
        limit: z.number().int().min(1).max(50).default(10).describe('Maximum deals to return.'),
        sortBy: sortBySchema.default('createdAt').describe('Sort field.'),
        sortOrder: sortOrderSchema.default('desc').describe('Sort direction.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const data = await readJson(buildUrl('deals', args));
        return asToolResult(data);
      } catch (error) {
        return asToolError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  server.registerTool(
    'deal_hunter_get_deal',
    {
      title: 'Get Deal Hunter Deal',
      description: 'Use this to fetch the full Deal Hunter record for a known deal id returned by search or ranked tools.',
      inputSchema: {
        id: z.string().trim().min(1).describe('Deal id from Deal Hunter.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      try {
        const data = await readJson(buildUrl(`deals/${encodeURIComponent(id)}`));
        return asToolResult(data);
      } catch (error) {
        return asToolError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  server.registerTool(
    'deal_hunter_get_ranked_deals',
    {
      title: 'Get Ranked Deal Hunter Deals',
      description: 'Use this when the user wants the best active deals ranked by Deal Hunter scoring and TMV analysis.',
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(10).describe('Maximum ranked deals to return.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const data = await readJson(buildUrl('ranked', args));
        return asToolResult(data);
      } catch (error) {
        return asToolError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  server.registerTool(
    'deal_hunter_get_tmv',
    {
      title: 'Get Deal Hunter TMV',
      description: 'Use this to fetch stored true-market-value analysis for a known Deal Hunter deal id.',
      inputSchema: {
        dealId: z.string().trim().min(1).describe('Deal id from Deal Hunter.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ dealId }) => {
      try {
        const data = await readJson(buildUrl(`tmv/${encodeURIComponent(dealId)}`));
        return asToolResult(data);
      } catch (error) {
        return asToolError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  server.registerTool(
    'deal_hunter_get_taxonomy',
    {
      title: 'Get Deal Hunter Taxonomy',
      description: 'Use this to discover available Deal Hunter categories, marketplaces, and aggregate stats before filtering searches.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const [categories, marketplaces, stats] = await Promise.all([
          readJson(buildUrl('deals/categories')),
          readJson(buildUrl('deals/marketplaces')),
          readJson(buildUrl('deals/stats')),
        ]);
        return asToolResult({ categories, marketplaces, stats });
      } catch (error) {
        return asToolError(error instanceof Error ? error.message : String(error));
      }
    }
  );
};

const createDealHunterServer = () => {
  const server = new McpServer(
    {
      name: 'deal-hunter',
      version: '0.1.0',
      websiteUrl: 'https://github.com/jnibarger/Deal-Hunter',
    },
    {
      instructions:
        'Use Deal Hunter tools for read-only deal discovery, ranking, and stored TMV analysis. Call deal_hunter_health when the API may be offline. Do not assume write/admin capabilities are available.',
    }
  );

  registerDealHunterTools(server);
  return server;
};

const runStdio = async () => {
  const server = createDealHunterServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();
  const keepAlive = setInterval(() => undefined, 1_000_000_000);
  const shutdown = async () => {
    clearInterval(keepAlive);
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
};

const runHttp = () => {
  const port = Number.parseInt(process.env.MCP_PORT ?? String(DEFAULT_HTTP_PORT), 10);
  const app = createMcpExpressApp({ host: '127.0.0.1' });
  app.use(
    cors({
      exposedHeaders: ['Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'],
      origin: process.env.MCP_CORS_ORIGIN ?? 'http://localhost',
    })
  );

  app.post('/mcp', async (req: ExpressRequest, res: ExpressResponse) => {
    const server = createDealHunterServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      res.on('close', () => {
        transport.close();
        server.close();
      });
    }
  });
  app.get('/mcp', (_req: ExpressRequest, res: ExpressResponse) => {
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  });
  app.delete('/mcp', (_req: ExpressRequest, res: ExpressResponse) => {
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  });

  const httpServer = app.listen(port, '127.0.0.1', () => {
    console.error(`Deal Hunter MCP listening on http://127.0.0.1:${port}/mcp`);
  });
  const keepAlive = setInterval(() => undefined, 1_000_000_000);

  process.on('SIGINT', async () => {
    clearInterval(keepAlive);
    httpServer.close();
    process.exit(0);
  });
};

const main = async () => {
  if (process.argv.includes('--http')) {
    runHttp();
    return;
  }

  await runStdio();
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
