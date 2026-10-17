import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function ShopErfolg() {
  const { refresh } = useAuth();
  useEffect(() => { const t = setInterval(refresh, 2000); return () => clearInterval(t); }, [refresh]);
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">Danke!</h1>
      <p className="muted">Deine Sterne werden gleich gutgeschrieben, sobald Stripe die Zahlung bestätigt hat.</p>
      <Link to="/shop" className="btn">Zurück zum Shop</Link>
    </div>
  );
}
