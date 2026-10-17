import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { addStars, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Nach einer Stripe-Zahlung: Sitzung prüfen und Sterne gutschreiben (einmalig pro Sitzung). */
export default async function ErfolgPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/shop");
  const { session_id } = await searchParams;
  let credited = 0;
  if (session_id && process.env.STRIPE_SECRET_KEY) {
    const db = getDb();
    const already = db.prepare("SELECT 1 FROM purchases WHERE item = ?").get(`stripe:${session_id}`);
    if (!already) {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      });
      const s = (await res.json()) as { payment_status?: string; metadata?: { user_id?: string; stars?: string } };
      if (s.payment_status === "paid" && Number(s.metadata?.user_id) === user.id) {
        credited = Number(s.metadata?.stars ?? 0);
        addStars(user.id, credited);
        db.prepare("INSERT INTO purchases (user_id, item, stars) VALUES (?, ?, ?)").run(user.id, `stripe:${session_id}`, -credited);
      }
    }
  }
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">Danke!</h1>
      <p className="muted">{credited > 0 ? `${credited} Sterne wurden gutgeschrieben.` : "Die Zahlung wurde verarbeitet."}</p>
      <Link href="/shop" className="btn">Zurück zum Shop</Link>
    </div>
  );
}
