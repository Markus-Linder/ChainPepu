/**
 * Datenschicht.
 *
 * Alles, was mit Speichern zu tun hat, läuft durch diese Datei. Für den Start
 * nutzen wir die in Node eingebaute SQLite-Datenbank (eine Datei auf dem Server).
 * Für große Nutzerzahlen wird hier auf Postgres gewechselt, der Rest der App
 * bleibt unverändert.
 */
import fs from "node:fs";
import path from "node:path";

type SqliteModule = typeof import("node:sqlite");
// Über getBuiltinModule, damit der Bundler das Modul nicht anfasst.
const sqlite = process.getBuiltinModule("node:sqlite") as SqliteModule;

type Raw = InstanceType<SqliteModule["DatabaseSync"]>;
type Params = (null | number | bigint | string | Uint8Array)[];

/** node:sqlite liefert Zeilen ohne Prototyp; wir machen daraus normale Objekte. */
function plain<T>(row: T): T {
  return row && typeof row === "object" ? ({ ...(row as object) } as T) : row;
}

export type DB = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: Params): unknown[];
    get(...params: Params): unknown;
    run(...params: Params): { changes: number | bigint; lastInsertRowid: number | bigint };
  };
};

function wrap(raw: Raw): DB {
  return {
    exec: (sql) => raw.exec(sql),
    prepare(sql) {
      const stmt = raw.prepare(sql);
      return {
        all: (...params) => (stmt.all as (...p: Params) => unknown[])(...params).map(plain),
        get: (...params) => plain((stmt.get as (...p: Params) => unknown)(...params)),
        run: (...params) => (stmt.run as (...p: Params) => { changes: number | bigint; lastInsertRowid: number | bigint })(...params),
      };
    },
  };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  planet_seed INTEGER NOT NULL,
  planet_skin TEXT NOT NULL DEFAULT 'standard',
  stars INTEGER NOT NULL DEFAULT 50,
  invited_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  origin_user_id INTEGER,
  boost INTEGER NOT NULL DEFAULT 0,
  daily_day TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL REFERENCES chains(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  color TEXT NOT NULL DEFAULT '#7c5cff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS links_chain ON links(chain_id, position);
CREATE INDEX IF NOT EXISTS links_user ON links(user_id);
CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL REFERENCES chains(id),
  inviter_id INTEGER NOT NULL REFERENCES users(id),
  used_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item TEXT NOT NULL,
  stars INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __chainpepuDb: DB | undefined;
}

export function getDb(): DB {
  if (globalThis.__chainpepuDb) return globalThis.__chainpepuDb;
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "chainpepu.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = wrap(new sqlite.DatabaseSync(file));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  globalThis.__chainpepuDb = db;
  return db;
}

/* ---------- Typen ---------- */

export type User = {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  planet_seed: number;
  planet_skin: string;
  stars: number;
  invited_by: number | null;
  created_at: string;
};

export type Chain = {
  id: number;
  title: string;
  origin_user_id: number | null;
  boost: number;
  daily_day: string | null;
  created_at: string;
};

export type ChainWithStats = Chain & {
  link_count: number;
  user_count: number;
  origin_username: string | null;
  origin_display_name: string | null;
  last_activity: string;
};

export type Link = {
  id: number;
  chain_id: number;
  user_id: number;
  position: number;
  text: string;
  image_url: string | null;
  color: string;
  created_at: string;
  username: string;
  display_name: string;
  planet_seed: number;
  planet_skin: string;
};

export type Invite = {
  token: string;
  chain_id: number;
  inviter_id: number;
  used_by: number | null;
  created_at: string;
};

/* ---------- Nutzer ---------- */

export function getUserByUsername(username: string): User | undefined {
  return getDb().prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function createUser(input: {
  username: string;
  display_name: string;
  password_hash: string;
  invited_by?: number | null;
}): User {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const res = getDb()
    .prepare(
      "INSERT INTO users (username, display_name, password_hash, planet_seed, invited_by) VALUES (?, ?, ?, ?, ?)"
    )
    .run(input.username, input.display_name, input.password_hash, seed, input.invited_by ?? null);
  return getUserById(Number(res.lastInsertRowid))!;
}

export function listUsers(): User[] {
  return getDb().prepare("SELECT * FROM users ORDER BY id").all() as User[];
}

export function setPlanetSkin(userId: number, skin: string) {
  getDb().prepare("UPDATE users SET planet_skin = ? WHERE id = ?").run(skin, userId);
}

export function addStars(userId: number, delta: number) {
  getDb().prepare("UPDATE users SET stars = stars + ? WHERE id = ?").run(delta, userId);
}

/** Zieht Sterne ab. Gibt false zurück, wenn nicht genug vorhanden sind. */
export function spendStars(userId: number, amount: number, item: string): boolean {
  const db = getDb();
  const res = db
    .prepare("UPDATE users SET stars = stars - ? WHERE id = ? AND stars >= ?")
    .run(amount, userId, amount);
  if (res.changes === 0) return false;
  db.prepare("INSERT INTO purchases (user_id, item, stars) VALUES (?, ?, ?)").run(userId, item, amount);
  return true;
}

/* ---------- Ketten ---------- */

const CHAIN_STATS_SQL = `
  SELECT c.*,
    (SELECT COUNT(*) FROM links l WHERE l.chain_id = c.id) AS link_count,
    (SELECT COUNT(DISTINCT user_id) FROM links l WHERE l.chain_id = c.id) AS user_count,
    u.username AS origin_username,
    u.display_name AS origin_display_name,
    COALESCE((SELECT MAX(created_at) FROM links l WHERE l.chain_id = c.id), c.created_at) AS last_activity
  FROM chains c
  LEFT JOIN users u ON u.id = c.origin_user_id
`;

export function createChain(input: { title: string; origin_user_id: number | null; daily_day?: string }): Chain {
  const res = getDb()
    .prepare("INSERT INTO chains (title, origin_user_id, daily_day) VALUES (?, ?, ?)")
    .run(input.title, input.origin_user_id, input.daily_day ?? null);
  return getChain(Number(res.lastInsertRowid))!;
}

export function getChain(id: number): ChainWithStats | undefined {
  return getDb().prepare(`${CHAIN_STATS_SQL} WHERE c.id = ?`).get(id) as ChainWithStats | undefined;
}

export function getDailyChain(day: string): ChainWithStats | undefined {
  return getDb().prepare(`${CHAIN_STATS_SQL} WHERE c.daily_day = ?`).get(day) as ChainWithStats | undefined;
}

export function listChains(opts: { limit?: number; order?: "hot" | "new" } = {}): ChainWithStats[] {
  const order =
    opts.order === "new"
      ? "c.created_at DESC"
      : "(link_count + c.boost * 3) DESC, last_activity DESC";
  return getDb()
    .prepare(`${CHAIN_STATS_SQL} ORDER BY ${order} LIMIT ?`)
    .all(opts.limit ?? 50) as ChainWithStats[];
}

export function listChainsByOrigin(userId: number): ChainWithStats[] {
  return getDb()
    .prepare(`${CHAIN_STATS_SQL} WHERE c.origin_user_id = ? ORDER BY c.created_at DESC`)
    .all(userId) as ChainWithStats[];
}

export function listChainsJoined(userId: number): ChainWithStats[] {
  return getDb()
    .prepare(
      `${CHAIN_STATS_SQL} WHERE c.id IN (SELECT DISTINCT chain_id FROM links WHERE user_id = ?)
       AND (c.origin_user_id IS NULL OR c.origin_user_id != ?) ORDER BY last_activity DESC`
    )
    .all(userId, userId) as ChainWithStats[];
}

export function boostChain(chainId: number, amount: number) {
  getDb().prepare("UPDATE chains SET boost = boost + ? WHERE id = ?").run(amount, chainId);
}

/* ---------- Glieder ---------- */

const LINK_SQL = `
  SELECT l.*, u.username, u.display_name, u.planet_seed, u.planet_skin
  FROM links l JOIN users u ON u.id = l.user_id
`;

export function getLinks(chainId: number): Link[] {
  return getDb().prepare(`${LINK_SQL} WHERE l.chain_id = ? ORDER BY l.position ASC`).all(chainId) as Link[];
}

export function addLink(input: {
  chain_id: number;
  user_id: number;
  text: string;
  image_url?: string | null;
  color?: string;
}): Link {
  const db = getDb();
  const next = db
    .prepare("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM links WHERE chain_id = ?")
    .get(input.chain_id) as { p: number };
  const res = db
    .prepare("INSERT INTO links (chain_id, user_id, position, text, image_url, color) VALUES (?, ?, ?, ?, ?, ?)")
    .run(input.chain_id, input.user_id, next.p, input.text, input.image_url ?? null, input.color ?? "#7c5cff");
  return db.prepare(`${LINK_SQL} WHERE l.id = ?`).get(Number(res.lastInsertRowid)) as Link;
}

export function listLinksByUser(userId: number, limit = 30): (Link & { chain_title: string })[] {
  return getDb()
    .prepare(
      `SELECT l.*, u.username, u.display_name, u.planet_seed, u.planet_skin, c.title AS chain_title
       FROM links l JOIN users u ON u.id = l.user_id JOIN chains c ON c.id = l.chain_id
       WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ?`
    )
    .all(userId, limit) as (Link & { chain_title: string })[];
}

/* ---------- Einladungen ---------- */

export function createInvite(token: string, chainId: number, inviterId: number): Invite {
  getDb()
    .prepare("INSERT INTO invites (token, chain_id, inviter_id) VALUES (?, ?, ?)")
    .run(token, chainId, inviterId);
  return getInvite(token)!;
}

export function getInvite(token: string): (Invite & { inviter_name: string; chain_title: string }) | undefined {
  return getDb()
    .prepare(
      `SELECT i.*, u.display_name AS inviter_name, c.title AS chain_title
       FROM invites i JOIN users u ON u.id = i.inviter_id JOIN chains c ON c.id = i.chain_id
       WHERE i.token = ?`
    )
    .get(token) as (Invite & { inviter_name: string; chain_title: string }) | undefined;
}

export function markInviteUsed(token: string, userId: number) {
  getDb().prepare("UPDATE invites SET used_by = ? WHERE token = ? AND used_by IS NULL").run(userId, token);
}

/* ---------- Universumskarte ---------- */

export type MapEdge = { chain_id: number; from_user: number; to_user: number };

export function getMapEdges(): MapEdge[] {
  // Verbindet aufeinanderfolgende Glieder unterschiedlicher Nutzer.
  return getDb()
    .prepare(
      `SELECT a.chain_id, a.user_id AS from_user, b.user_id AS to_user
       FROM links a JOIN links b ON b.chain_id = a.chain_id AND b.position = a.position + 1
       WHERE a.user_id != b.user_id`
    )
    .all() as MapEdge[];
}

export function getStats() {
  const db = getDb();
  const u = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  const c = db.prepare("SELECT COUNT(*) AS n FROM chains").get() as { n: number };
  const l = db.prepare("SELECT COUNT(*) AS n FROM links").get() as { n: number };
  return { users: u.n, chains: c.n, links: l.n };
}
