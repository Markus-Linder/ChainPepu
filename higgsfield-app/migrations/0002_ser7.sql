-- ser7: eingetragene Webseiten/Videos und gebuchte Sponsorplätze (nur additive Änderungen)
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'web',            -- web | video
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  promo TEXT NOT NULL DEFAULT '',              -- z. B. "15 % auf alle Schuhe"
  promo_until TEXT,                            -- JJJJ-MM-TT, leer = unbegrenzt
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected
  check_result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS listings_status ON listings(status);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,                  -- privater Zugang für den Werbekunden
  url TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL,
  promo TEXT NOT NULL DEFAULT '',
  days INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',       -- unpaid | review | active | rejected
  stripe_session TEXT,
  starts_at TEXT,
  ends_at TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  check_result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS campaigns_status ON campaigns(status);
