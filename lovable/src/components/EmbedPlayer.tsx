import { useState } from "react";
import { parseEmbed } from "@/lib/embed";
import { useT } from "@/lib/i18n";
import { Icon } from "./Icons";

/** Lazy embed of a TikTok / YouTube / Instagram video: loads only after a tap (saves data, no tracking until then). */
export function EmbedPlayer({ url }: { url: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const e = parseEmbed(url);
  if (!e) return <a href={url} target="_blank" rel="noreferrer" className="mt-3 block text-sm underline">{url}</a>;
  const label = e.provider === "tiktok" ? "TikTok" : e.provider === "youtube" ? "YouTube" : "Instagram";
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black" style={{ aspectRatio: e.ratio, maxHeight: "32rem" }}>
      {open ? (
        <iframe src={e.src} title={label} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm">
          <span className="rounded-full bg-white/10 p-4"><Icon name="play" size={28} filled /></span>
          <span>{t("embed_play", { provider: label })}</span>
        </button>
      )}
    </div>
  );
}
