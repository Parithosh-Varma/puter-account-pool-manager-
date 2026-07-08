# puter-account-pool-manager

Manage multiple Puter accounts, route AI requests through accounts with available credit, monitor everything from a dashboard.

## Quick start

```bash
cp .env.example .env
# Add your account tokens to .env
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
- If an account's credit runs out or it gets rate-limited, it's disabled automatically
- Failed requests retry on a different account
- If all accounts are busy, requests wait in a queue
- A dashboard shows real-time stats, credit usage, success rates, and latency

Two scheduling strategies: **round-robin** (even distribution) or **least-used** (prefers accounts with more remaining credit).

## API

```
POST /api/ai/chat          Submit an AI request (auto-routed)
GET  /api/accounts         List accounts with health + credit
POST /api/accounts         Add an account
DELETE /api/accounts/:id   Remove an account
PATCH /api/accounts/:id    Update name/token/status/limit
GET  /api/stats            Pool stats
GET  /api/dashboard        Full data for the React UI
GET  /healthz              Liveness check
```

Example AI request:
```json
{
  "model": "gpt-4o-mini",
  "prompt": "hello"
}
```

## Config

Accounts via JSON:
```env
ACCOUNTS=[{"id":"a1","name":"Main","token":"puter-token-here","dailyCreditLimit":100}]
```

Or individual vars:
```env
ACCOUNT_1_ID=a1
ACCOUNT_1_TOKEN=puter-token-here
```

Set strategy:
```env
SCHEDULER_STRATEGY=least-used
```

Full options in `.env.example`.

## Getting a Puter token

1. Go to https://puter.com and sign in
2. DevTools → Application → Local Storage
3. Copy `puter.auth.token.v2`

## Docker

```bash
export ACCOUNTS='[{"id":"a1","name":"Main","token":"...","dailyCreditLimit":100}]'
export API_KEY=your-key
docker compose up -d
```

## Tests

```bash
npm test        # 54 tests
npm run test:coverage
```

## License

Apache-2.0
