CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY,
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  default_label TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id           INTEGER PRIMARY KEY,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label        TEXT,
  started_at   INTEGER NOT NULL,
  ended_at     INTEGER,
  paused_ms    INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL CHECK(status IN ('active','paused','completed'))
);

CREATE TABLE IF NOT EXISTS drops (
  id         INTEGER PRIMARY KEY,
  run_id     INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  logged_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id);
CREATE INDEX IF NOT EXISTS idx_drops_run ON drops(run_id);
