CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY,
  account_id TEXT,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_responses_created_at ON ai_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_responses_account_id ON ai_responses (account_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_success ON ai_responses (success);

CREATE TABLE IF NOT EXISTS puter_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  daily_credit_limit INTEGER NOT NULL DEFAULT 100,
  model TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
