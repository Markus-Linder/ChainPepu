import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">Hier ist nur Leere.</h1>
      <p className="muted mt-2">Diese Seite gibt es im Universum nicht.</p>
      <Link href="/" className="btn mt-6">Zurück ins Universum</Link>
    </div>
  );
}
