#!/usr/bin/env node
/**
 * Legt die Stripe-Produkte und Preise für Profiangebot an und gibt die
 * Umgebungsvariablen für die Supabase Edge Functions aus.
 *
 * Aufruf:  STRIPE_SECRET_KEY=sk_live_... npm run stripe:setup
 * Idempotent: vorhandene Produkte (per metadata.key) werden wiederverwendet.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Bitte STRIPE_SECRET_KEY setzen, z.B.: STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup");
  process.exit(1);
}
const stripe = new Stripe(key);

const PRODUCTS = [
  { key: "premium_report", name: "Profiangebot Prüfbericht Premium", description: "Vollständiger KI-Prüfbericht für ein Handwerker-Angebot: alle Positionen, fehlende Leistungen mit Kostenschätzung, Rückfragen, Verhandlungstipps, PDF.", amount: 999, recurring: null, env: "STRIPE_PRICE_PREMIUM_REPORT", tax_code: "txcd_10000000" },
  { key: "lead", name: "Profiangebot Kundenanfrage", description: "Freischaltung der Kontaktdaten einer qualifizierten Kundenanfrage (max. 3 Betriebe pro Anfrage).", amount: 4900, recurring: null, env: "STRIPE_PRICE_LEAD", tax_code: "txcd_10000000" },
  { key: "lead_member", name: "Profiangebot Kundenanfrage (Mitglieder)", description: "Freischaltung der Kontaktdaten einer Kundenanfrage zum Mitgliederpreis.", amount: 3900, recurring: null, env: "STRIPE_PRICE_LEAD_MEMBER", tax_code: "txcd_10000000" },
  { key: "membership", name: "Profiangebot Betriebe-Mitgliedschaft", description: "Verifiziertes Profil, Vorrang bei neuen Anfragen, reduzierte Anfragepreise, Statistiken.", amount: 5900, recurring: { interval: "month" }, env: "STRIPE_PRICE_MEMBERSHIP", tax_code: "txcd_10000000" },
];

async function findProduct(k) {
  const res = await stripe.products.search({ query: `metadata['key']:'${k}' AND active:'true'` });
  return res.data[0] ?? null;
}

const out = [];
for (const p of PRODUCTS) {
  let product = await findProduct(p.key);
  if (!product) {
    product = await stripe.products.create({ name: p.name, description: p.description, metadata: { key: p.key, app: "profiangebot" }, tax_code: p.tax_code });
    console.log(`Produkt angelegt: ${p.name} (${product.id})`);
  } else {
    console.log(`Produkt vorhanden: ${p.name} (${product.id})`);
  }
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find((pr) => pr.unit_amount === p.amount && pr.currency === "eur" && (!!pr.recurring === !!p.recurring));
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: p.amount,
      tax_behavior: "inclusive",
      ...(p.recurring ? { recurring: p.recurring } : {}),
      metadata: { key: p.key },
    });
    console.log(`  Preis angelegt: ${(p.amount / 100).toFixed(2)} € (${price.id})`);
  } else {
    console.log(`  Preis vorhanden: ${(p.amount / 100).toFixed(2)} € (${price.id})`);
  }
  out.push(`${p.env}=${price.id}`);
}

console.log("\nDiese Secrets in Supabase setzen (Dashboard → Edge Functions → Secrets oder CLI):\n");
console.log(out.join("\n"));
console.log(`\nCLI-Befehl:\nsupabase secrets set ${out.join(" ")}\n`);
console.log("Webhook-Endpunkt in Stripe anlegen: https://<PROJEKT>.supabase.co/functions/v1/stripe-webhook");
console.log("Events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted");
