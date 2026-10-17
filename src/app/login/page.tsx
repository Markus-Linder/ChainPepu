import Link from "next/link";
import { LoginForm } from "@/components/Forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Willkommen zurück</h1>
      <div className="card p-5"><LoginForm next={next} /></div>
      <p className="muted text-center text-sm">Noch keinen Planeten? <Link href={`/registrieren${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Jetzt erschaffen</Link></p>
    </div>
  );
}
