import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Coins } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { callFunction, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n/client";
import { CREATOR_PLAN, CREDIT_PACKS, formatMoney } from "@shared/economy";
import { supabaseConfigured } from "@/integrations/supabase/client";

export default function Pricing() {
  const { t, locale } = useI18n();
  const { user, isAnonymous, profile, ensureSession, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const checkout = async (kind: "subscription" | "credits", packId?: string) => {
    if (kind === "subscription" && (!user || isAnonymous)) return navigate("/login?next=/pricing");
    setBusy(packId ?? kind);
    try {
      await ensureSession();
      const base = window.location.origin;
      const res = await callFunction<{ url: string; sandbox?: boolean }>("checkout", {
        kind,
        packId,
        locale,
        successUrl: `${base}${kind === "subscription" ? "/onboarding" : window.location.pathname}?checkout=success`,
        cancelUrl: `${base}/pricing?checkout=cancel`,
      });
      if (res.sandbox) {
        await refreshProfile();
        toast({ title: "✓", description: t.pricing.sandbox_note, variant: "success" });
        if (kind === "subscription") navigate("/onboarding");
      } else {
        window.location.href = res.url;
      }
    } catch (e) {
      toast({ title: t.app.error_generic, description: e instanceof ApiError ? e.message : undefined, variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  const active = profile && ["active", "trialing"].includes(profile.subscription_status);

  return (
    <div className="container py-12">
      <h1 className="text-center text-4xl font-extrabold">{t.pricing.title}</h1>
      <p className="mt-3 text-center text-muted-foreground">{t.pricing.revenue_note}</p>
      {!supabaseConfigured && <p className="mt-2 text-center text-xs text-warning">Supabase is not configured – connect it in Lovable to enable payments.</p>}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/25 via-card to-card p-8">
          <Badge tone="primary" className="mb-4">{t.pricing.creator_plan}</Badge>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold">{formatMoney(CREATOR_PLAN.priceCents, locale)}</span>
            <span className="pb-2 text-muted-foreground">{t.pricing.per_month}</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {t.pricing.creator_features.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check size={18} className="mt-0.5 shrink-0 text-success" /> {f}</li>
            ))}
          </ul>
          <Button className="mt-8 w-full" disabled={busy === "subscription" || Boolean(active)} onClick={() => checkout("subscription")}>
            {active ? t.dashboard.status.active : t.pricing.subscribe}
          </Button>
        </Card>

        <div>
          <h2 className="text-2xl font-bold">{t.pricing.credits_title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.pricing.credits_text}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {CREDIT_PACKS.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-2xl font-extrabold"><Coins className="text-warning" /> {p.credits.toLocaleString(locale)}</span>
                  {p.badge && <Badge tone={p.badge === "popular" ? "primary" : "success"}>{p.badge === "popular" ? t.pricing.popular : t.pricing.best_value}</Badge>}
                </div>
                <div className="mt-1 text-muted-foreground">{formatMoney(p.priceCents, locale)}</div>
                <Button variant="secondary" className="mt-4" disabled={busy === p.id} onClick={() => checkout("credits", p.id)}>
                  {t.pricing.buy}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
