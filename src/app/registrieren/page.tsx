import Link from "next/link";
import { RegisterForm } from "@/components/Forms";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; invite?: string }> }) {
  const { next, invite } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Deinen Planeten erschaffen</h1>
      <p className="muted text-sm">Kostenlos. Kein Abo. Dein Planet bekommt ein einzigartiges Aussehen, das nur du hast.</p>
      <div className="card p-5"><RegisterForm next={next} invite={invite} /></div>
      <p className="muted text-center text-sm">Schon dabei? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Anmelden</Link></p>
    </div>
  );
}
