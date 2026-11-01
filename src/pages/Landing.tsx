import { Link } from "react-router-dom";
import { Brain, Fingerprint, MessagesSquare, Coins, ArrowRight, Sparkles } from "lucide-react";
import { CreatureCanvas } from "@/components/creature/CreatureCanvas";
import { Card } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n/client";
import { DEMO_DNA, SHOWCASE_DNAS } from "@/lib/demo";
import { useAuth } from "@/hooks/useAuth";
import { BRAND } from "@/config/brand";

export default function Landing() {
  const { t } = useI18n();
  const { user, isAnonymous } = useAuth();
  const loggedIn = Boolean(user && !isAnonymous);
  return (
    <div>
      <section className="container grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
        <div className="animate-fade-up">
          <span className="chip mb-5 border-primary/40 text-primary"><Sparkles size={14} /> {BRAND.tagline}</span>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            <span className="gradient-text">{t.app.tagline}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t.app.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={loggedIn ? "/onboarding" : "/login"} className="btn-primary">{t.app.cta_creator} <ArrowRight size={18} /></Link>
            <Link to="/arena" className="btn-secondary">{t.app.cta_explore}</Link>
          </div>
        </div>
        <div className="animate-fade-up h-[420px] lg:h-[520px]" style={{ animationDelay: "120ms" }}>
          <CreatureCanvas dna={DEMO_DNA} mood="happy" cosmetics={["shades"]} autoRotate className="h-full shadow-glow" />
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.landing.demo_caption}</p>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="mb-8 text-center text-3xl font-bold">{t.landing.how_title}</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            [t.landing.step1_title, t.landing.step1_text],
            [t.landing.step2_title, t.landing.step2_text],
            [t.landing.step3_title, t.landing.step3_text],
            [t.landing.step4_title, t.landing.step4_text],
          ].map(([title, text], i) => (
            <Card key={title} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary font-bold text-white">{i + 1}</div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHOWCASE_DNAS.map((dna) => (
            <div key={dna.seed} className="h-56">
              <CreatureCanvas dna={dna} mood="content" interactive={false} lowPower className="h-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="container grid gap-4 py-12 md:grid-cols-2">
        <Feature icon={<Fingerprint />} title={t.landing.feature_unique} text={t.landing.feature_unique_text} />
        <Feature icon={<Brain />} title={t.landing.feature_memory} text={t.landing.feature_memory_text} />
        <Feature icon={<MessagesSquare />} title={t.landing.feature_social} text={t.landing.feature_social_text} />
        <Feature icon={<Coins />} title={t.landing.feature_earn} text={t.landing.feature_earn_text} />
      </section>

      <section className="container py-16 text-center">
        <Card className="mx-auto max-w-3xl bg-gradient-to-br from-primary/20 via-card to-secondary/10 p-10">
          <h2 className="text-3xl font-bold">{t.pricing.creator_plan} · €9.99 {t.pricing.per_month}</h2>
          <p className="mt-3 text-muted-foreground">{t.pricing.revenue_note}</p>
          <Link to="/pricing" className="btn-primary mt-6">{t.pricing.subscribe}</Link>
        </Card>
      </section>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="flex gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">{icon}</div>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </Card>
  );
}
