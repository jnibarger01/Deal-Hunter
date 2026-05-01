# Deal Hunter MCP

Read-only MCP server for Deal Hunter. It exposes deal discovery and analysis data to MCP clients without OpenAI API keys.

## Auth Model

This server does not read ChatGPT cookies, Codex auth files, or hidden OpenAI tokens. ChatGPT account authentication happens in ChatGPT itself when you add/use a connector. The MCP server only talks to your Deal Hunter API.

The current implementation is intentionally read-only, so it does not require Deal Hunter admin credentials. If write tools are added later, they should use a first-party Deal Hunter OAuth/login flow or explicit operator auth, not ChatGPT web-session reuse.

## Local Stdio

```bash
npm run build:mcp
npm run start --workspace mcp
```

Set `DEAL_HUNTER_API_BASE_URL` if the API is not at `http://127.0.0.1:5000/api/v1`.

## Streamable HTTP

```bash
npm run build:mcp
npm run start:http --workspace mcp
```

The MCP endpoint is `http://127.0.0.1:3333/mcp` by default. Set `MCP_PORT` to change it.

ChatGPT-hosted MCP usage requires a publicly reachable HTTPS URL. For a private local setup, put this behind a trusted tunnel or deployment endpoint and restrict access before adding write tools.
