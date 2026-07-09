# Puter Account Pool Manager — Free AI API with No Limits

**Get a free AI API** for **Claude Fable 5**, **Claude Sonnet 5**, **Gemini 2.5 Pro**, GPT-4o, DeepSeek, and 400+ models by pooling free Puter accounts. **Unlimited AI credits** — no credit card, no rate limits, no token costs.

Each Puter account comes with free daily AI credits. When one runs out, this tool seamlessly failovers to the next — so you never see `"No usage left for request"` again.

> **SEO keywords:** free AI API · free AI credits · unlimited AI API · free Claude API · free GPT-4 API · free Gemini API · free DeepSeek API · AI API pool · Puter accounts pool · free LLM API · no cost AI API · free AI model router

```bash
git clone https://github.com/Parithosh-Varma/puter-account-pool-manager-.git
cp .env.example .env   # add Supabase credentials
npm install && npm run build && npm start

# Separate terminal:
cd dashboard && npm install && npm run dev
```

## How it works

1. **Create multiple Puter accounts** (free at puter.com)
2. **Sign in with Puter** in the dashboard to link them
3. Every AI request is routed through an account with available credit
4. When an account hits its daily limit, the scheduler automatically retries on the next healthy account
5. You get uninterrupted access — the pool handles the rotation transparently

**It's a free AI API proxy** — an OpenAI-compatible endpoint that distributes requests across your accounts, so no single account ever runs out. Use it as a **free alternative to OpenAI**, **free alternative to Claude API**, or **free alternative to Gemini API**. Every model Puter offers is available.

## Features

- **Free AI API** — fully OpenAI-compatible at `/v1/chat/completions` with SSE streaming
- **400+ free models** — Claude Fable 5, Claude Sonnet 5, Gemini 2.5 Pro, GPT-4o, DeepSeek V3, Qwen, Llama, Mistral, and more
- **Unlimited AI credits** — automatic failover across accounts means you never hit a cap
- **No manual token extraction** — "Sign in with Puter" button handles authentication
- **Accounts persist in Supabase** — survives server restarts
- **React dashboard** with built-in chat UI, model selector with provider logos, real-time pool stats
- **Free AI API key alternative** — no Stripe, no usage billing, no credit card required
- **Docker support** — one-command deploy with docker-compose

## API

```
POST /v1/chat/completions        OpenAI-compatible chat (SSE streaming)
GET  /v1/models                  OpenAI-compatible model list

POST /api/ai/chat                Submit an AI request (auto-routed)
GET  /api/models                 List all available Puter models
GET  /api/accounts               List accounts with health + credit
POST /api/accounts               Add an account
DELETE /api/accounts/:id         Remove an account
PATCH /api/accounts/:id          Update status/token
GET  /api/stats                  Pool stats
GET  /api/dashboard              Full data for the React UI
GET  /api/history                Request history
GET  /healthz                    Liveness check
```

Example (works with any OpenAI SDK):
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-fable-5","messages":[{"role":"user","content":"Hello"}]}'
```

Using the OpenAI Python SDK:
```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:3000/v1", api_key="ignored")
response = client.chat.completions.create(
    model="claude-fable-5",
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.choices[0].message.content)
```

## Config

Full options in `.env.example`.

Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | — | Supabase project URL (accounts persist here) |
| `SUPABASE_KEY` | — | Supabase service-role key |
| `SCHEDULER_STRATEGY` | round-robin | `round-robin` or `least-used` |
| `MAX_RETRIES` | 3 | How many accounts to try before failing |
| `HEALTH_CHECK_INTERVAL_MS` | 60000 | How often to re-verify accounts |

## Dashboard

Open `http://localhost:5173` to:
- Chat with any model for free (Claude Fable 5, Sonnet 5, Gemini 2.5 Pro, etc.)
- Add accounts via "Sign in with Puter"
- Monitor pool health, credit, latency, error rates
- Enable/disable/delete accounts
- Switch scheduling strategy

## Database

Run `supabase-schema.sql` in Supabase SQL editor to create `puter_accounts` (account storage) and `ai_responses` (request history).

## Docker

```bash
export SUPABASE_URL=... SUPABASE_KEY=...
docker compose up -d
```

## Tests

```bash
npm test              # 54 tests
npm run test:coverage
npm run typecheck
```

## License

Apache-2.0
