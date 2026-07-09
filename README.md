# Puter Account Pool Manager

Get unlimited AI usage on **Claude Fable 5**, **Claude Sonnet 5**, **Gemini 2.5 Pro**, and 400+ other models by pooling multiple Puter accounts.

Each Puter account comes with free daily credits. When one runs out, this tool seamlessly failovers to the next — so you never see `"No usage left for request"` again.

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

Best of all, there's no provider lock-in. Use the same pool for Fable 5, Sonnet 5, Gemini 2.5 Pro, GPT-4o, DeepSeek, Qwen, Llama — every model Puter offers is available.

## Features

- **OpenAI-compatible API** at `/v1/chat/completions` with SSE streaming — works as a drop-in replacement for any OpenAI SDK
- **400+ models** fetched dynamically from Puter's API — no hardcoded lists, no restrictions
- **Automatic failover** — if one account is exhausted, rate-limited, or errored, the next healthy account handles the request
- **"Sign in with Puter"** — no manual token extraction, just click and authenticate
- **Account persistence** via Supabase — accounts survive server restarts
- **React dashboard** with chat interface, real-time stats, and account management (enable/disable/re-auth/delete)
- **Docker support** with docker-compose

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

Example:
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-fable-5","messages":[{"role":"user","content":"Hello"}]}'
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
- Chat with any model (searchable dropdown with provider logos)
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
