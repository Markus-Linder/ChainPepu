import { Link, useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/Forms";

export default function Login() {
  const next = useSearchParams()[0].get("next") ?? undefined;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Willkommen zurück</h1>
      <div className="card p-5"><LoginForm next={next} /></div>
      <p className="muted text-center text-sm">Noch keinen Planeten? <Link to={`/registrieren${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Jetzt erschaffen</Link></p>
    </div>
  );
}
