import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { StartChainForm } from "@/components/Forms";
import { Loading } from "@/lib/useAsync";

export default function Neu() {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/neu" replace />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Eine neue Kette starten</h1>
      <p className="muted text-sm">Du bist der Ursprung. Egal wie lang die Kette wird, dein Planet bleibt am Anfang sichtbar.</p>
      <div className="card p-5"><StartChainForm /></div>
    </div>
  );
}
