import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { StartChainForm } from "@/components/Forms";

export default async function NeuPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/neu");
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Eine neue Kette starten</h1>
      <p className="muted text-sm">Du bist der Ursprung. Egal wie lang die Kette wird, dein Planet bleibt am Anfang sichtbar.</p>
      <div className="card p-5"><StartChainForm /></div>
    </div>
  );
}
