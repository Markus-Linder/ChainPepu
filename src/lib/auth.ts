import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getUserById, type User } from "./db";

const COOKIE = "cp_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage

function secret() {
  return process.env.SESSION_SECRET || "entwicklungs-schluessel-bitte-in-env-setzen";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(userId: number) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const payload = `${id}.${exp}`;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return getUserById(Number(id)) ?? null;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function randomToken(bytes = 12) {
  return crypto.randomBytes(bytes).toString("base64url");
}
