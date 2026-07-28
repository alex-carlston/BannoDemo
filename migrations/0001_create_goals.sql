CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL CHECK (target_amount > 0),
  current_amount REAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  account_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_created ON savings_goals(user_id, created_at DESC);
