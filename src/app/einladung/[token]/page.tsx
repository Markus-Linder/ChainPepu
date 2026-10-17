import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getInvite } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/Forms";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = getInvite(token);
  if (!invite) notFound();
  const user = await currentUser();
  if (user) redirect(`/c/${invite.chain_id}`);
  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <p className="muted text-xs uppercase tracking-widest">Einladung</p>
      <h1 className="text-2xl font-extrabold">{invite.inviter_name} will, dass du das nächste Glied bist.</h1>
      <p className="muted">Kette: <span className="text-white">„{invite.chain_title}“</span></p>
      <div className="card p-5 text-left"><RegisterForm invite={token} next={`/c/${invite.chain_id}`} /></div>
      <p className="muted text-sm">Schon einen Planeten? <Link href={`/login?next=/c/${invite.chain_id}`} className="underline">Anmelden</Link></p>
    </div>
  );
}
