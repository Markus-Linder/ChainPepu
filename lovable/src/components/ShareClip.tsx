import { useState } from "react";
import { useT } from "@/lib/i18n";
import { renderChainClip, shareBlob } from "@/lib/share";
import type { ChainStats, LinkRow } from "@/lib/types";
import { Icon } from "./Icons";
import { Notice } from "./Forms";

/** "Share clip": a 9:16 story image of the chain for TikTok, Instagram and WhatsApp. */
export function ShareClip({ chain, title, firstLink }: { chain: ChainStats; title: string; firstLink?: LinkRow }) {
  const { t } = useT();
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/c/${chain.id}`;

  const make = async () => {
    setBusy(true); setOk(null);
    try {
      await document.fonts?.ready;
      const blob = await renderChainClip({
        chain, title, url,
        labels: { links: t("n_links", { n: chain.link_count }).replace(/^\S+\s/, ""), planets: t("n_planets", { n: chain.user_count }).replace(/^\S+\s/, ""), stars: t("stars_from_fans"), cta: t("share_cta"), by: t("from") },
        seed: firstLink?.profiles.planet_seed, skin: firstLink?.profiles.planet_skin, excerpt: firstLink?.text,
      });
      setPreview({ url: URL.createObjectURL(blob), blob });
    } finally { setBusy(false); }
  };
  const share = async () => {
    if (!preview) return;
    const r = await shareBlob(preview.blob, `chainpepu-${chain.id}.png`, title, url);
    setOk(r === "shared" ? t("share_done") : t("share_downloaded"));
  };

  return (
    <div className="card card-glow p-4">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Icon name="comet" size={16} />{t("share_clip")}</h2>
      <p className="muted mb-3 text-xs">{t("share_clip_text")}</p>
      {preview ? (
        <div className="space-y-2">
          <img src={preview.url} alt="" className="mx-auto max-h-80 rounded-xl border border-white/10" />
          <div className="flex gap-2">
            <button className="btn flex-1 text-sm" onClick={share}><Icon name="comet" size={14} />{t("share_share")}</button>
            <button className="btn btn-ghost flex-1 text-sm" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? t("copied") : t("copy_link")}</button>
          </div>
          <Notice ok={ok} />
        </div>
      ) : (
        <button className="btn w-full text-sm" disabled={busy} onClick={make}><Icon name="image" size={14} />{busy ? t("share_generating") : t("share_make")}</button>
      )}
    </div>
  );
}
