import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getInvite } from "@/lib/api";
import { useAsync, Loading } from "@/lib/useAsync";
import { RegisterForm } from "@/components/Forms";
import NotFound from "./NotFound";

export default function Einladung() {
  const token = String(useParams().token);
  const { profile } = useAuth();
  const { data: invite, loading } = useAsync(() => getInvite(token), [token]);
  if (loading) return <Loading />;
  if (!invite) return <NotFound />;
  if (profile) return <Navigate to={`/c/${invite.chain_id}`} replace />;
  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <p className="muted text-xs uppercase tracking-widest">Einladung</p>
      <h1 className="text-2xl font-extrabold">{invite.profiles.display_name} will, dass du das nächste Glied bist.</h1>
      <p className="muted">Kette: <span className="text-white">„{invite.chains.title}“</span></p>
      <div className="card p-5 text-left"><RegisterForm invite={token} next={`/c/${invite.chain_id}`} /></div>
      <p className="muted text-sm">Schon einen Planeten? <Link to={`/login?next=/c/${invite.chain_id}`} className="underline">Anmelden</Link></p>
    </div>
  );
}
