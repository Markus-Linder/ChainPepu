import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://profiangebot.de";

export function formatEUR(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: digits }).format(value);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(iso));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
