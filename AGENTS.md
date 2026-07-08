# Agent Instructions for Puter Account Pool Manager

## Build Commands

```bash
# Install all dependencies
npm install
cd dashboard && npm install

# Build TypeScript
npm run build

# Run in development (hot reload)
npm run dev

# Run tests
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# Type checking
npm run typecheck
```

## Code Conventions

- **TypeScript**: strict mode, ES2022 target, commonjs modules
- **No comments in source code** unless absolutely necessary
- **Imports**: external libraries first, then internal modules with absolute paths from `src/`
- **Error handling**: always use try/catch with proper error messages; never swallow errors
- **Logging**: always use the logger module, never `console.log` in production code
- **Events**: use EventEmitter for module communication
- **Testing**: Vitest with `describe`/`it`/`expect` pattern; mock external HTTP calls
- **File naming**: PascalCase for classes/components, camelCase for functions/variables, kebab-case for directories

## Architecture Rules

- Each module in `src/*/` is self-contained with a single exported class
- Modules communicate through events (EventEmitter) or direct method calls
- The `index.ts` entry point wires everything together
- Configuration is loaded once and cached; use `resetConfig()` in tests
- API routes are stateless; all state lives in the modules

## Verification

After making changes:
1. Run `npm run typecheck` to verify TypeScript types
2. Run `npm test` to verify tests pass
3. Run `npm run build` to verify compilation

## Docker Commands

```bash
docker compose build          # Build images
docker compose up -d          # Start services
docker compose down           # Stop services
docker compose logs -f        # View logs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | HTTP server port |
| NODE_ENV | development | Environment mode |
| PUTER_API_BASE_URL | https://api.puter.com | Puter API endpoint |
| ACCOUNTS | [] | JSON array of account objects |
| SCHEDULER_STRATEGY | round-robin | Scheduling strategy |
| HEALTH_CHECK_INTERVAL_MS | 60000 | Health check frequency |
| MAX_RETRIES | 3 | Request retry limit |
| LOG_LEVEL | info | Logging verbosity |
| API_KEY | change-me | Production API auth key |
