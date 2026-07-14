# Optional Python MCP gateway

Default: the Next.js app runs MCP tools in `/api/mcp` (recommended for Vercel).

Use this package when you want a separate deploy (Fly/Railway):

```bash
cd packages/mcp-gateway
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your-key
uvicorn server:app --host 0.0.0.0 --port 8080
```

Then in `apps/web/.env.local`:

```
MCP_GATEWAY_URL=http://localhost:8080
```

Verify:

```bash
curl -X POST http://localhost:8080/mcp/tools/get_weather \
  -H 'content-type: application/json' \
  -d '{"lat":40.7,"lon":-74.0}'
```
