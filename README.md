# puter-account-pool-manager

Pool multiple Puter accounts, route AI requests through accounts with available credit, monitor everything from a React dashboard with a built-in chat interface.

## Quick start

```bash
cp .env.example .env
# Add Supabase credentials and optionally Puter tokens to .env
npm install
npm run build
npm start
```

Dashboard (separate terminal):
```bash
cd dashboard && npm install && npm run dev
```

## How it works

You have N Puter accounts, each with some free AI credits per day. This service pools them together:

- Routes each AI request to an account that still has credit
- If an account's credit runs out or it gets rate-limited, the request automatically failovers to the next healthy account
- Failed requests retry on a different account (configurable retry count)
- If all accounts are busy, requests wait in a queue
- Accounts persist across restarts via Supabase `puter_accounts` table
- A dashboard shows real-time stats, credit usage, success rates, and latency

Two scheduling strategies: **round-robin** (even distribution) or **least-used** (prefers accounts with more remaining credit).

**Credit formula:** Each account's displayed credit = `number of accounts × 0.25` (simple heuristic, actual Puter credit limits are handled via 402 failover).

## Adding accounts

Use **"Sign in with Puter"** in the dashboard — opens a popup to `puter.com/?action=authme`, then captures the token via callback. No manual token/password fields.

For token recovery of existing accounts, each card has a **"Re-auth with Puter"** button.

## Features

- **OpenAI-compatible API** at `/v1/models` and `/v1/chat/completions` (with SSE streaming) — drop-in replacement for the OpenAI SDK
- **Models fetched dynamically** from Puter API — all 400+ models available, no restrictions, no hardcoded lists
- **Provider logos** in the chat model selector (Anthropic, Google, Qwen, etc.)
- **Account delete** with confirmation prompt in the dashboard
- **Health checker** automatically verifies accounts periodically, resets expired tokens to active on success
- **Supabase storage** — responses saved to `ai_responses` table, accounts to `puter_accounts` table

## API

```
POST /api/ai/chat                Submit an AI request (auto-routed)
GET  /api/accounts               List accounts with health + credit
POST /api/accounts               Add an account
DELETE /api/accounts/:id         Remove an account
PATCH /api/accounts/:id          Update name/token/status/limit
GET  /api/models                 List all available Puter models
GET  /api/stats                  Pool stats
GET  /api/dashboard              Full data for the React UI
GET  /api/history                Request history
GET  /healthz                    Liveness check

GET  /v1/models                  OpenAI-compatible model list
POST /v1/chat/completions        OpenAI-compatible chat (supports SSE streaming)
```

Example AI request:
```json
{
  "model": "claude-sonnet-5",
  "prompt": "hello"
}
```

## Config

```env
# Supabase (required for persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Accounts can be added via the dashboard UI instead
ACCOUNTS=[{"id":"a1","name":"Main","token":"puter-token-here"}]

# Strategy
SCHEDULER_STRATEGY=least-used
```

Full options in `.env.example`.

## Dashboard

```
http://localhost:5173
```

Includes:
- Pool stats (total/active/error accounts, request counts, latency)
- Account cards with status, health, credit, enable/disable/re-auth/delete
- Chat interface with model selector (searchable, provider logos)
- Usage graph
- Strategy control (round-robin / least-used)

## Database (Supabase)

Run `supabase-schema.sql` in your Supabase SQL editor to create the required tables:
- `puter_accounts` — account storage
- `ai_responses` — AI response history

## Docker

```bash
export ACCOUNTS='[{"id":"a1","name":"Main","token":"..."}]'
export API_KEY=your-key
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
