import Link from "next/link";
import type { Link as ChainLink } from "@/lib/db";
import { Planet } from "./Planet";

export function LinkItem({ link, isOrigin }: { link: ChainLink; isOrigin: boolean }) {
  return (
    <li className="relative pl-14">
      <span className="absolute top-7 left-5 h-[calc(100%+1rem)] w-0.5 bg-white/10" aria-hidden />
      <Link href={`/p/${link.username}`} className="absolute top-0 left-0">
        <Planet seed={link.planet_seed} skin={link.planet_skin} size={42} title={link.display_name} />
      </Link>
      <div className="card p-4" style={{ borderLeft: `4px solid ${link.color}` }}>
        <div className="mb-1 flex items-center gap-2 text-xs">
          <Link href={`/p/${link.username}`} className="font-semibold hover:underline">{link.display_name}</Link>
          <span className="muted">@{link.username}</span>
          {isOrigin && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Ursprung</span>}
          <span className="muted ml-auto">#{link.position}</span>
        </div>
        <p className="whitespace-pre-wrap">{link.text}</p>
        {link.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.image_url} alt="" className="mt-3 max-h-96 rounded-lg object-cover" loading="lazy" />
        )}
      </div>
    </li>
  );
}
