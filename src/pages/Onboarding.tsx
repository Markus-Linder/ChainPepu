import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Link2, Sparkles, Wand2, Beaker } from "lucide-react";
import { Button, Card, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { CreatureCanvas } from "@/components/creature/CreatureCanvas";
import { useAuth } from "@/hooks/useAuth";
import { useMyCreature } from "@/hooks/useCreature";
import { callFunction, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n/client";
import { supabase, functionsUrl } from "@/integrations/supabase/client";
import { SANDBOX_PROFILES } from "@shared/tiktok";
import type { CreatureRow } from "@shared/types";
import { cn } from "@/lib/utils";

type Source = "tiktok" | "prompt" | "photo" | "sandbox";

export default function Onboarding() {
  const { t, locale } = useI18n();
  const { user, isAnonymous, profile, ready, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mine = useMyCreature(user?.id);
  const [source, setSource] = useState<Source>("tiktok");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sandboxProfile, setSandboxProfile] = useState("fitmax");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [tiktokConfigured, setTiktokConfigured] = useState<boolean | null>(null);
  const [stage, setStage] = useState<"form" | "hatching" | "done">("form");
  const [stageText, setStageText] = useState("");
  const [result, setResult] = useState<CreatureRow | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const tiktokConnected = Boolean(profile?.tiktok_open_id) || params.get("tiktok") === "connected";

  useEffect(() => {
    fetch(`${functionsUrl}/tiktok-auth?action=status`).then((r) => r.json()).then((j) => {
      setTiktokConfigured(Boolean(j.configured));
      if (!j.configured) setSource("sandbox");
    }).catch(() => setTiktokConfigured(false));
  }, []);

  useEffect(() => {
    if (params.get("tiktok") === "connected") refreshProfile();
  }, [params, refreshProfile]);

  if (!ready) return <div className="grid min-h-[60vh] place-items-center"><Spinner /></div>;
  if (!user || isAnonymous) {
    navigate("/login?next=/onboarding", { replace: true });
    return null;
  }
  if (mine.data && stage === "form") {
    navigate(`/dashboard`, { replace: true });
    return null;
  }

  const subscribed = profile && (["active", "trialing"].includes(profile.subscription_status) || (profile.subscription_status === "canceled" && profile.subscription_ends_at && new Date(profile.subscription_ends_at) > new Date()));

  const connectTikTok = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${functionsUrl}/tiktok-auth?action=start&redirect=${encodeURIComponent(`${window.location.origin}/onboarding`)}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      const j = await res.json();
      if (j.url) window.location.href = j.url;
      else throw new Error(j.error ?? "TikTok not configured");
    } catch (e) {
      toast({ title: t.app.error_generic, description: (e as Error).message, variant: "error" });
    }
  };

  const hatch = async () => {
    setStage("hatching");
    setStageText(t.onboarding.analyzing);
    try {
      let photoPath: string | undefined;
      if (source === "photo") {
        if (!photo) throw new Error("Choose a photo");
        photoPath = `${user.id}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const { error } = await supabase.storage.from("genesis-uploads").upload(photoPath, photo, { contentType: photo.type });
        if (error) throw error;
      }
      const timer1 = setTimeout(() => setStageText(t.onboarding.building_dna), 1800);
      const timer2 = setTimeout(() => setStageText(t.onboarding.personality), 4200);
      const res = await callFunction<{ creature: CreatureRow }>("hatch", { name, source, prompt, sandboxProfile, photoPath, locale });
      clearTimeout(timer1);
      clearTimeout(timer2);
      setResult(res.creature);
      setStage("done");
      await refreshProfile();
    } catch (e) {
      setStage("form");
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast({ title: t.app.error_generic, description: msg, variant: "error" });
      if (e instanceof ApiError && e.code === "subscription_required") navigate("/pricing");
    }
  };

  if (stage === "hatching") {
    return (
      <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="relative h-40 w-40">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <div className="absolute inset-4 animate-pulse rounded-full bg-gradient-to-br from-primary to-secondary shadow-glow" />
          <Sparkles className="absolute inset-0 m-auto text-white" size={48} />
        </div>
        <h1 className="mt-8 text-3xl font-extrabold">{t.onboarding.title}</h1>
        <p className="mt-2 animate-pulse text-muted-foreground">{stageText}</p>
      </div>
    );
  }

  if (stage === "done" && result) {
    return (
      <div className="container grid items-center gap-8 py-12 lg:grid-cols-2">
        <div className="h-[460px]"><CreatureCanvas dna={result.dna} mood="ecstatic" autoRotate className="h-full shadow-glow" /></div>
        <div className="animate-fade-up">
          <span className="chip border-success/40 text-success">{t.onboarding.done}</span>
          <h1 className="mt-4 text-5xl font-extrabold">{result.name}</h1>
          <p className="text-lg text-muted-foreground">{result.species} · {result.persona.archetype}</p>
          <p className="mt-4 italic">“{result.persona.tagline}”</p>
          <p className="mt-3 text-sm text-muted-foreground">{result.persona.backstory}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {result.persona.catchphrases.map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
          <div className="mt-8 flex gap-3">
            <Link to={`/c/${result.slug}`} className="btn-primary">{t.app.view_page}</Link>
            <Link to="/dashboard" className="btn-secondary">{t.app.dashboard}</Link>
          </div>
        </div>
      </div>
    );
  }

  const sources: { id: Source; icon: React.ReactNode; title: string; text: string; disabled?: boolean }[] = [
    { id: "tiktok", icon: <Link2 />, title: "TikTok", text: t.landing.step1_text, disabled: tiktokConfigured === false },
    { id: "prompt", icon: <Wand2 />, title: "Prompt", text: "Describe your dream creature in your own words." },
    { id: "photo", icon: <Camera />, title: "Photo", text: "Upload a photo – your pet, your style, your vibe." },
    { id: "sandbox", icon: <Beaker />, title: "Sample", text: "Try a sample creator profile." },
  ];

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-4xl font-extrabold">{t.onboarding.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.landing.step2_text}</p>
      {!subscribed && (
        <Card className="mt-6 border-warning/40 text-sm">
          {t.onboarding.needs_subscription} <Link to="/pricing" className="underline">{t.pricing.subscribe}</Link>
          <span className="block text-xs text-muted-foreground">(Sandbox: ALLOW_FREE_HATCH lets you continue without one.)</span>
        </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {sources.map((s) => (
          <button key={s.id} disabled={s.disabled} onClick={() => setSource(s.id)} className={cn("glass rounded-2xl p-4 text-left transition hover:border-primary/50 disabled:opacity-40", source === s.id && "border-primary ring-2 ring-primary/50")}>
            <div className="flex items-center gap-3"><span className="text-primary">{s.icon}</span><span className="font-bold">{s.title}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
          </button>
        ))}
      </div>

      <Card className="mt-6 space-y-4">
        {source === "tiktok" && (
          <div>
            {tiktokConnected ? (
              <p className="text-sm text-success">✓ TikTok connected{profile?.tiktok_username ? ` (@${profile.tiktok_username})` : ""}</p>
            ) : (
              <Button variant="secondary" onClick={connectTikTok}><Link2 size={18} /> {t.app.login_tiktok}</Button>
            )}
          </div>
        )}
        {source === "prompt" && (
          <textarea className="input min-h-28" placeholder="A tiny purple dragon with golden horns who loves ramen and tells terrible jokes…" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1500} />
        )}
        {source === "photo" && (
          <div className="space-y-3">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPhoto(f);
              setPhotoPreview(f ? URL.createObjectURL(f) : null);
            }} />
            <button className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black/20" onClick={() => fileInput.current?.click()}>
              {photoPreview ? <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2 text-muted-foreground"><Camera /> Choose a photo (max 8 MB)</span>}
            </button>
            <input className="input" placeholder="Optional wishes (e.g. make it fluffy and brave)" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={300} />
          </div>
        )}
        {source === "sandbox" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(SANDBOX_PROFILES).map(([key, p]) => (
              <button key={key} onClick={() => setSandboxProfile(key)} className={cn("rounded-xl border border-white/10 p-3 text-left text-sm hover:border-primary/50", sandboxProfile === key && "border-primary")}>
                <div className="font-bold">@{p.user.username}</div>
                <div className="text-xs text-muted-foreground">{p.user.bio_description}</div>
              </button>
            ))}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">{t.onboarding.name_label}</label>
          <input className="input" placeholder={t.onboarding.name_placeholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        </div>
        <Button className="w-full" disabled={name.trim().length < 2 || (source === "tiktok" && !tiktokConnected) || (source === "prompt" && prompt.trim().length < 8) || (source === "photo" && !photo)} onClick={hatch}>
          <Sparkles size={18} /> {t.onboarding.hatch}
        </Button>
      </Card>
    </div>
  );
}
