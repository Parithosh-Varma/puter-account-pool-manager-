# Puter Account Pool Manager

A production-ready account pool manager for Puter.js that manages multiple authenticated accounts and automatically routes AI requests through accounts with available free credit.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API (Express)                        │
│  /api/accounts  /api/ai/chat  /api/stats  /api/dashboard    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   Request Scheduler                          │
│           round-robin / least-used scheduling                │
│              queue management + retry logic                  │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
┌──────┴──────┐ ┌─────┴──────┐ ┌────┴─────────┐
│  Account    │ │   Credit   │ │   Health     │
│  Manager    │ │  Tracker   │ │  Checker     │
├─────────────┤ ├────────────┤ ├──────────────┤
│ CRUD ops    │ │ Usage cnt  │ │ Ping /whoami │
│ Status mgmt │ │ Daily cap  │ │ Error rates  │
│ Event emit  │ │ Auto reset │ │ Status flags │
└─────────────┘ └────────────┘ └──────────────┘
       │              │              │
┌──────┴──────────────┴──────────────┴────────────────────────┐
│              Authentication Manager                          │
│            Verifies tokens via PUTER API                     │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Logger (Winston)                          │
│              Structured JSON logging to console + file       │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-account management** — add/remove accounts at runtime via REST API
- **Smart request routing** — round-robin and least-used scheduling strategies
- **Credit tracking** — automatic detection of exhausted accounts
- **Fault tolerance** — retry failed requests on alternative accounts
- **Request queuing** — queue when all accounts are busy
- **Health monitoring** — periodic health checks per account
- **Comprehensive logging** — per-request audit trail with latency, status, retry count
- **REST API** — full CRUD for accounts, AI chat proxy, stats, health
- **Web dashboard** — React UI with real-time stats, usage graphs, account controls
- **Docker support** — Dockerfile and docker-compose for production deployment

## Quick Start

### Prerequisites

- Node.js >= 20
- npm

### Installation

```bash
git clone <repo-url> puter-account-pool
cd puter-account-pool
npm install
```

### Configuration

Copy the environment template and configure your accounts:

```bash
cp .env.example .env
```

Edit `.env` with your account tokens. Accounts can be configured via JSON:

```env
ACCOUNTS=[{"id":"acc1","name":"My Account","token":"your-puter-auth-token","dailyCreditLimit":100}]
```

Or via individual variables:

```env
ACCOUNT_1_ID=acc1
ACCOUNT_1_NAME=My Account
ACCOUNT_1_TOKEN=your-puter-auth-token
ACCOUNT_1_DAILY_LIMIT=100
```

### Getting a Puter Auth Token

1. Visit [https://puter.com](https://puter.com) and sign in
2. Open browser DevTools → Application → Local Storage
3. Find the key `puter.auth.token` (or `puter.auth.token.v2`)
4. Copy the token value

> **Important**: Keep tokens secure. Never commit them to version control.

### Running the Server

```bash
# Development with hot reload
npm run dev

# Production build and start
npm run build
npm start
```

### Running the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

The dashboard runs on `http://localhost:5173` and proxies API requests to the server.

## REST API Endpoints

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts with health and credit info |
| GET | `/api/accounts/:id` | Get single account details |
| POST | `/api/accounts` | Add a new account |
| PATCH | `/api/accounts/:id` | Update account (name, token, status, limit) |
| DELETE | `/api/accounts/:id` | Remove an account |
| GET | `/api/accounts/:id/status` | Get account status, health, and credit |
| GET | `/api/accounts/:id/credit` | Get remaining credit for an account |

### AI Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Submit an AI chat request (auto-routed) |

**Request body:**
```json
{
  "model": "gpt-4o-mini",
  "prompt": "Hello, how are you?",
  "stream": false,
  "maxTokens": 1000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "response": "I'm doing well, thank you!",
  "accountId": "acc-1",
  "latency": 1234,
  "retryCount": 0,
  "statusCode": 200,
  "error": null
}
```

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Pool-wide request statistics |
| GET | `/api/dashboard` | Full dashboard data (accounts + stats + history) |
| GET | `/api/health` | Health check status for all accounts |
| POST | `/api/health/run` | Trigger immediate health check |
| GET | `/api/queue` | Current queue and active request counts |
| GET | `/api/history` | Recent request history (max 1000) |
| GET | `/api/strategy` | Get current scheduling strategy |
| PUT | `/api/strategy` | Set scheduling strategy (`round-robin` or `least-used`) |

### Liveness & Readiness

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Liveness probe (always 200 if running) |
| GET | `/readyz` | Readiness probe (200 if active accounts exist, 503 otherwise) |

## Scheduling Strategies

### Round Robin
Requests are distributed evenly across all healthy accounts in sequence. Best for balancing load when all accounts have similar credit limits.

### Least Used
Requests are routed to the account with the lowest credit usage. Best for maximizing availability when accounts have varying credit limits or usage patterns.

## Docker Deployment

### Build and Run

```bash
# Build the production image
docker compose build

# Start the service
docker compose up -d

# View logs
docker compose logs -f
```

### Environment Variables for Docker

```bash
export ACCOUNTS='[{"id":"acc1","name":"Main","token":"...","dailyCreditLimit":100}]'
export API_KEY='your-secure-api-key'
docker compose up
```

### Multi-stage Docker Build

The `Dockerfile` uses a multi-stage build:
1. **builder** — compiles TypeScript
2. **dashboard-builder** — builds the React dashboard
3. **runner** — minimal Alpine image with compiled artifacts

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

| File | Type | Description |
|------|------|-------------|
| `tests/config.test.ts` | Unit | Configuration loading and parsing |
| `tests/account-manager.test.ts` | Unit | Account CRUD, status, events |
| `tests/credit-tracker.test.ts` | Unit | Credit tracking, exhaustion, reset |
| `tests/scheduler.test.ts` | Unit | Request scheduling and routing |
| `tests/integration.test.ts` | Integration | Full API endpoint testing |

## Project Structure

```
├── src/
│   ├── index.ts                    # Application entry point
│   ├── types.ts                    # TypeScript type definitions
│   ├── config/index.ts             # Configuration loader
│   ├── logger/index.ts             # Winston logging module
│   ├── accounts/AccountManager.ts  # Account CRUD and state management
│   ├── auth/AuthenticationManager.ts # Token verification
│   ├── credit/CreditTracker.ts     # Usage tracking and limits
│   ├── health/HealthChecker.ts     # Periodic health monitoring
│   ├── scheduler/RequestScheduler.ts # AI request routing
│   └── api/
│       ├── routes.ts               # REST API route definitions
│       └── middleware.ts           # Auth and logging middleware
├── dashboard/
│   ├── src/
│   │   ├── App.tsx                 # Main dashboard layout
│   │   ├── hooks/useApi.ts         # API data fetching hook
│   │   └── components/
│   │       ├── AccountList.tsx     # Account grid display
│   │       ├── AccountCard.tsx     # Individual account card
│   │       ├── Statistics.tsx      # Pool statistics cards
│   │       ├── UsageGraph.tsx      # Latency and request charts
│   │       └── StrategyControl.tsx # Strategy switcher
│   └── index.html
├── tests/                          # Test files
├── Dockerfile                      # Multi-stage production build
├── docker-compose.yml              # Docker Compose configuration
└── .env.example                    # Environment variable template
```

## Extending for Additional AI Providers

The architecture supports adding new AI providers. To add a new provider:

1. Add the provider's API endpoint and auth mechanism in `RequestScheduler.ts`
2. Add provider-specific configuration in `config/index.ts`
3. Add provider-specific health checks in `HealthChecker.ts`
4. Extend the `AIRequestInput` type with provider-specific parameters

## Security

- Account tokens are stored in environment variables (never committed to git)
- API keys are required for production access (`x-api-key` header)
- Tokens are redacted in all API responses
- Helmet middleware provides HTTP security headers
- Rate limiting protects against abuse
- Graceful shutdown handles SIGTERM and SIGINT

## License

Apache-2.0
