"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addLink,
  addStars,
  boostChain,
  createChain,
  createInvite,
  createUser,
  getChain,
  getDailyChain,
  getInvite,
  getUserByUsername,
  markInviteUsed,
  setPlanetSkin,
  spendStars,
} from "./db";
import { createSession, currentUser, destroySession, hashPassword, randomToken, verifyPassword } from "./auth";
import { SKINS } from "./planet";
import { themeForDay, todayKey } from "./events";
import { BOOST_COST, STAR_PACKS, stripeEnabled } from "./shop";

export type ActionState = { error?: string; ok?: string } | undefined;

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const username = String(form.get("username") || "").trim().toLowerCase();
  const displayName = String(form.get("display_name") || "").trim();
  const password = String(form.get("password") || "");
  const invite = String(form.get("invite") || "");
  const next = String(form.get("next") || "");

  if (!USERNAME_RE.test(username)) return { error: "Nutzername: 3 bis 20 Zeichen, nur Kleinbuchstaben, Zahlen, Unterstrich." };
  if (displayName.length < 1 || displayName.length > 40) return { error: "Bitte einen Anzeigenamen mit 1 bis 40 Zeichen wählen." };
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };
  if (getUserByUsername(username)) return { error: "Dieser Nutzername ist schon vergeben." };

  let invitedBy: number | null = null;
  const inv = invite ? getInvite(invite) : undefined;
  if (inv) invitedBy = inv.inviter_id;

  const user = createUser({ username, display_name: displayName, password_hash: await hashPassword(password), invited_by: invitedBy });
  if (inv) {
    markInviteUsed(invite, user.id);
    addStars(inv.inviter_id, 10); // Einladen lohnt sich.
  }
  await createSession(user.id);
  redirect(next || (inv ? `/c/${inv.chain_id}` : `/p/${username}`));
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const username = String(form.get("username") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "");
  const user = getUserByUsername(username);
  if (!user || !(await verifyPassword(password, user.password_hash))) return { error: "Nutzername oder Passwort stimmt nicht." };
  await createSession(user.id);
  redirect(next || "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function startChainAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/neu");
  const title = String(form.get("title") || "").trim();
  const text = String(form.get("text") || "").trim();
  const imageUrl = cleanUrl(String(form.get("image_url") || ""));
  const color = cleanColor(String(form.get("color") || ""));
  if (title.length < 2 || title.length > 80) return { error: "Der Titel braucht 2 bis 80 Zeichen." };
  if (text.length < 1 || text.length > 500) return { error: "Das erste Glied braucht 1 bis 500 Zeichen." };
  const chain = createChain({ title, origin_user_id: user.id });
  addLink({ chain_id: chain.id, user_id: user.id, text, image_url: imageUrl, color });
  revalidatePath("/");
  redirect(`/c/${chain.id}`);
}

export async function appendLinkAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const chainId = Number(form.get("chain_id"));
  const user = await currentUser();
  if (!user) redirect(`/login?next=/c/${chainId}`);
  const chain = getChain(chainId);
  if (!chain) return { error: "Diese Kette gibt es nicht." };
  const text = String(form.get("text") || "").trim();
  const imageUrl = cleanUrl(String(form.get("image_url") || ""));
  const color = cleanColor(String(form.get("color") || ""));
  if (text.length < 1 || text.length > 500) return { error: "Dein Glied braucht 1 bis 500 Zeichen." };
  addLink({ chain_id: chain.id, user_id: user.id, text, image_url: imageUrl, color });
  addStars(user.id, 1); // Mitmachen gibt einen Stern.
  revalidatePath(`/c/${chainId}`);
  revalidatePath("/");
  return { ok: "Dein Glied hängt jetzt an der Kette." };
}

export async function createInviteAction(chainId: number): Promise<string> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=/c/${chainId}`);
  const token = randomToken();
  createInvite(token, chainId, user.id);
  return token;
}

export async function boostChainAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const chainId = Number(form.get("chain_id"));
  const user = await currentUser();
  if (!user) redirect(`/login?next=/c/${chainId}`);
  if (!spendStars(user.id, BOOST_COST, `boost:${chainId}`)) return { error: `Dafür brauchst du ${BOOST_COST} Sterne.` };
  boostChain(chainId, 1);
  revalidatePath(`/c/${chainId}`);
  revalidatePath("/");
  return { ok: "Deine Kette leuchtet jetzt heller." };
}

export async function buySkinAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const skin = String(form.get("skin") || "");
  const user = await currentUser();
  if (!user) redirect("/login?next=/shop");
  const item = SKINS[skin];
  if (!item) return { error: "Diesen Planeten-Skin gibt es nicht." };
  if (item.price > 0 && !spendStars(user.id, item.price, `skin:${skin}`)) return { error: `Dafür brauchst du ${item.price} Sterne.` };
  setPlanetSkin(user.id, skin);
  revalidatePath("/shop");
  revalidatePath(`/p/${user.username}`);
  return { ok: `Dein Planet trägt jetzt den Skin „${item.name}“.` };
}

export async function buyStarsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const packId = String(form.get("pack") || "");
  const user = await currentUser();
  if (!user) redirect("/login?next=/shop");
  const pack = STAR_PACKS.find((p) => p.id === packId);
  if (!pack) return { error: "Dieses Paket gibt es nicht." };

  if (!stripeEnabled()) {
    // Demo-Modus: ohne Zahlungsanbieter werden die Sterne direkt gutgeschrieben.
    addStars(user.id, pack.stars);
    revalidatePath("/shop");
    return { ok: `Demo-Modus: ${pack.stars} Sterne gutgeschrieben. Mit Stripe-Schlüssel läuft hier eine echte Zahlung.` };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${base}/shop/erfolg?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/shop`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(pack.priceCents),
    "line_items[0][price_data][product_data][name]": `ChainPepu ${pack.label}`,
    "metadata[user_id]": String(user.id),
    "metadata[stars]": String(pack.stars),
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = (await res.json()) as { url?: string; error?: { message: string } };
  if (!data.url) return { error: data.error?.message || "Stripe hat keine Zahlungsseite geliefert." };
  redirect(data.url);
}

/** Legt die heutige Tages-Kette an, falls sie noch fehlt, und gibt ihre ID zurück. */
export async function ensureDailyChain(): Promise<number> {
  const day = todayKey();
  const existing = getDailyChain(day);
  if (existing) return existing.id;
  const chain = createChain({ title: themeForDay(day), origin_user_id: null, daily_day: day });
  return chain.id;
}

function cleanUrl(s: string): string | null {
  const v = s.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return v.slice(0, 500);
  } catch {
    return null;
  }
}

function cleanColor(s: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : "#7c5cff";
}
