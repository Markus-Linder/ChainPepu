import { Link } from "react-router-dom";
import type { LinkRow } from "@/lib/types";
import { Planet } from "./Planet";
import { ReportButton } from "./Forms";
import { useAuth } from "@/lib/auth";

export function LinkItem({ link, isOrigin }: { link: LinkRow; isOrigin: boolean }) {
  const { profile } = useAuth();
  const p = link.profiles;
  const hidden = link.status !== "sichtbar";
  return (
    <li className="relative pl-14">
      <span className="absolute left-5 top-7 h-[calc(100%+1rem)] w-0.5 bg-white/10" aria-hidden />
      <Link to={`/p/${p.username}`} className="absolute left-0 top-0">
        <Planet seed={p.planet_seed} skin={p.planet_skin} size={42} title={p.display_name} />
      </Link>
      <div className={`card p-4 ${hidden ? "opacity-60" : ""}`} style={{ borderLeft: `4px solid ${link.color}` }}>
        <div className="mb-1 flex items-center gap-2 text-xs">
          <Link to={`/p/${p.username}`} className="font-semibold hover:underline">{p.display_name}</Link>
          <span className="muted">@{p.username}</span>
          {isOrigin && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Ursprung</span>}
          {hidden && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-200">{link.status === "gesperrt" ? "Gesperrt" : "In Prüfung"}</span>}
          <span className="muted ml-auto">#{link.position}</span>
        </div>
        <p className="whitespace-pre-wrap">{link.text}</p>
        {link.video_url && <video src={link.video_url} controls playsInline preload="metadata" className="mt-3 max-h-[28rem] w-full rounded-lg bg-black" />}
        {link.image_url && <img src={link.image_url} alt="" className="mt-3 max-h-96 rounded-lg object-cover" loading="lazy" />}
        {profile && profile.id !== link.user_id && !hidden && <div className="mt-2 text-right"><ReportButton linkId={link.id} /></div>}
      </div>
    </li>
  );
}
