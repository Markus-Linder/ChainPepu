import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, LogOut, Mail, Phone } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessRow, MarketplaceLead, PurchasedLead } from "@/integrations/supabase/types";
import { createCheckout } from "@/lib/api";
import { TRADES, TRADE_BY_SLUG } from "@/data/trades";
import { PRICES } from "@/data/legal";
import { formatDate, formatEUR } from "@/lib/utils";

const emptyProfile = { company_name: "", contact_name: "", email: "", phone: "", street: "", plz: "", city: "", website: "", handwerksrolle_nr: "", trades: [] as string[], regions: "" };

export default function BetriebeDashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const tab = params.get("tab") ?? "anfragen";

  useEffect(() => {
    if (!loading && !user) navigate("/betriebe/login", { replace: true });
  }, [user, loading, navigate]);

  const bizQ = useQuery({
    queryKey: ["business", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as BusinessRow | null;
    },
  });
  const leadsQ = useQuery({ queryKey: ["marketplace"], enabled: !!bizQ.data, queryFn: async () => { const { data, error } = await supabase.rpc("list_marketplace_leads"); if (error) throw error; return (data ?? []) as MarketplaceLead[]; } });
  const boughtQ = useQuery({ queryKey: ["purchased"], enabled: !!bizQ.data, queryFn: async () => { const { data, error } = await supabase.rpc("get_purchased_leads"); if (error) throw error; return (data ?? []) as PurchasedLead[]; } });

  useEffect(() => {
    if (params.get("paid") === "1") { toast.success("Zahlung erfolgreich. Die Kontaktdaten werden freigeschaltet."); const t = setInterval(() => { qc.invalidateQueries({ queryKey: ["purchased"] }); qc.invalidateQueries({ queryKey: ["marketplace"] }); }, 4000); setTimeout(() => clearInterval(t), 30000); }
    if (params.get("subscribed") === "1") { toast.success("Mitgliedschaft aktiv. Willkommen!"); setTimeout(() => qc.invalidateQueries({ queryKey: ["business"] }), 4000); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || bizQ.isLoading) return <div className="container py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!user) return null;

  const biz = bizQ.data;

  return (
    <>
      <SEO title="Betriebe-Dashboard" description="Anfragen, Käufe und Profil." path="/betriebe/dashboard" noindex />
      <div className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold">{biz?.company_name ?? "Ihr Betrieb"}</h1><div className="text-sm text-muted-foreground flex items-center gap-2">{user.email}{biz?.subscription_status === "active" && <Badge variant="success"><BadgeCheck className="h-3 w-3 mr-1" />Mitglied</Badge>}</div></div>
          <Button variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}><LogOut /> Abmelden</Button>
        </div>
        {!biz ? (
          <Card className="mt-6"><CardHeader><CardTitle>Betriebsprofil anlegen</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-4">Damit wir Ihnen passende Anfragen zeigen, brauchen wir Gewerke und Region.</p><ProfileForm userId={user.id} userEmail={user.email ?? ""} existing={null} onSaved={() => qc.invalidateQueries({ queryKey: ["business"] })} /></CardContent></Card>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="mt-6">
            <TabsList><TabsTrigger value="anfragen">Anfragen {leadsQ.data ? `(${leadsQ.data.filter((l) => !l.purchased).length})` : ""}</TabsTrigger><TabsTrigger value="gekauft">Meine Kunden {boughtQ.data ? `(${boughtQ.data.length})` : ""}</TabsTrigger><TabsTrigger value="profil">Profil und Mitgliedschaft</TabsTrigger></TabsList>
            <TabsContent value="anfragen"><Marketplace leads={leadsQ.data ?? []} loading={leadsQ.isLoading} member={biz.subscription_status === "active"} /></TabsContent>
            <TabsContent value="gekauft"><Purchased leads={boughtQ.data ?? []} loading={boughtQ.isLoading} /></TabsContent>
            <TabsContent value="profil">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Betriebsprofil</CardTitle></CardHeader><CardContent><ProfileForm userId={user.id} userEmail={user.email ?? ""} existing={biz} onSaved={() => { qc.invalidateQueries({ queryKey: ["business"] }); qc.invalidateQueries({ queryKey: ["marketplace"] }); }} /></CardContent></Card>
                <Card><CardHeader><CardTitle>Mitgliedschaft</CardTitle></CardHeader><CardContent className="text-sm space-y-3">
                  {biz.subscription_status === "active" ? <><p>Ihre Mitgliedschaft ist aktiv{biz.subscription_current_period_end ? ` bis ${formatDate(biz.subscription_current_period_end)}` : ""}. Anfragen kosten {PRICES.leadMemberEUR} € statt {PRICES.leadEUR} €.</p><Button variant="outline" onClick={() => createCheckout({ kind: "subscription" }).catch((e) => toast.error(e.message))}>Abo verwalten</Button></> : <><p>{PRICES.membershipEUR} € pro Monat zzgl. MwSt.: Anfragen für {PRICES.leadMemberEUR} € statt {PRICES.leadEUR} €, verifiziertes Profil, Vorrang bei neuen Anfragen. Monatlich kündbar.</p><Button onClick={() => createCheckout({ kind: "subscription" }).catch((e) => toast.error(e.message))}>Mitglied werden</Button></>}
                </CardContent></Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

function Marketplace({ leads, loading, member }: { leads: MarketplaceLead[]; loading: boolean; member: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return <div className="py-10 flex justify-center"><Spinner /></div>;
  const open = leads.filter((l) => !l.purchased);
  if (!open.length) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Derzeit keine offenen Anfragen für Ihre Gewerke und Regionen. Erweitern Sie unter Profil die PLZ-Gebiete, um mehr Anfragen zu sehen. Neue Anfragen erhalten Sie per E-Mail.</CardContent></Card>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {open.map((l) => (
        <Card key={l.id}><CardContent className="p-5">
          <div className="flex items-start justify-between gap-2"><div><div className="text-xs text-muted-foreground">{TRADE_BY_SLUG[l.trade]?.name ?? l.trade} · PLZ {l.region}xxx{l.city ? ` · ${l.city}` : ""} · {formatDate(l.created_at)}</div><div className="font-semibold mt-1">{l.title}</div></div><Badge variant={l.buyers_count === 0 ? "success" : "warning"}>{l.buyers_count}/{l.max_buyers} vergeben</Badge></div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{l.summary}</p>
          <div className="mt-3 text-sm space-y-1">
            {l.existing_quote_total != null && <div>Vorliegendes Angebot: <strong>{formatEUR(l.existing_quote_total)}</strong></div>}
            {(l.budget_min != null || l.budget_max != null) && <div>Marktspanne: {formatEUR(l.budget_min)} bis {formatEUR(l.budget_max)}</div>}
            {l.timeframe && <div>Zeitrahmen: {l.timeframe}</div>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm"><strong>{member ? PRICES.leadMemberEUR : PRICES.leadEUR} €</strong> <span className="text-muted-foreground">zzgl. MwSt.</span></div>
            <Button size="sm" disabled={busy === l.id} onClick={async () => { setBusy(l.id); try { await createCheckout({ kind: "lead", lead_id: l.id }); } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); setBusy(null); } }}>{busy === l.id ? <Spinner className="text-white" /> : "Kontaktdaten freischalten"}</Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function Purchased({ leads, loading }: { leads: PurchasedLead[]; loading: boolean }) {
  if (loading) return <div className="py-10 flex justify-center"><Spinner /></div>;
  if (!leads.length) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Noch keine freigeschalteten Anfragen. <Link className="underline" to="/betriebe/dashboard?tab=anfragen">Zu den Anfragen</Link></CardContent></Card>;
  return (
    <div className="space-y-4">
      {leads.map((l) => (
        <Card key={l.id}><CardContent className="p-5 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><div className="text-xs text-muted-foreground">{TRADE_BY_SLUG[l.trade]?.name ?? l.trade} · {l.plz} {l.city ?? ""} · freigeschaltet {formatDate(l.purchased_at)}</div><div className="font-semibold mt-1">{l.title}</div><p className="mt-2 text-sm text-muted-foreground">{l.summary}</p>{l.existing_quote_total != null && <div className="mt-2 text-sm">Vorliegendes Angebot: <strong>{formatEUR(l.existing_quote_total)}</strong></div>}{l.timeframe && <div className="text-sm">Zeitrahmen: {l.timeframe}</div>}</div>
          <div className="rounded-lg bg-secondary p-4 text-sm space-y-2"><div className="font-semibold">{l.customer_name}</div>{l.customer_phone && <a className="flex items-center gap-2 underline" href={`tel:${l.customer_phone}`}><Phone className="h-4 w-4" />{l.customer_phone}</a>}<a className="flex items-center gap-2 underline" href={`mailto:${l.customer_email}`}><Mail className="h-4 w-4" />{l.customer_email}</a><div className="text-xs text-muted-foreground">Bevorzugt: {l.preferred_contact === "email" ? "E-Mail" : "Telefon"}. Bitte innerhalb von 24 Stunden melden.</div></div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function ProfileForm({ userId, userEmail, existing, onSaved }: { userId: string; userEmail: string; existing: BusinessRow | null; onSaved: () => void }) {
  const initial = useMemo(() => existing ? { ...emptyProfile, ...existing, phone: existing.phone ?? "", street: existing.street ?? "", plz: existing.plz ?? "", city: existing.city ?? "", website: existing.website ?? "", handwerksrolle_nr: existing.handwerksrolle_nr ?? "", regions: existing.regions.join(", ") } : { ...emptyProfile, email: userEmail }, [existing, userEmail]);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(initial), [initial]);

  const toggleTrade = (slug: string) => setF((x) => ({ ...x, trades: x.trades.includes(slug) ? x.trades.filter((t) => t !== slug) : [...x.trades, slug] }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.trades.length) return toast.error("Bitte mindestens ein Gewerk wählen.");
    const regions = f.regions.split(/[,\s]+/).map((r) => r.trim().slice(0, 2)).filter((r) => /^\d{2}$/.test(r));
    setBusy(true);
    const payload = { user_id: userId, company_name: f.company_name, contact_name: f.contact_name, email: f.email, phone: f.phone || null, street: f.street || null, plz: f.plz || null, city: f.city || null, website: f.website || null, handwerksrolle_nr: f.handwerksrolle_nr || null, trades: f.trades, regions };
    const { error } = existing ? await supabase.from("businesses").update(payload).eq("id", existing.id) : await supabase.from("businesses").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert.");
    onSaved();
  };

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div><Label>Firma</Label><Input required value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
      <div><Label>Ansprechpartner</Label><Input required value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
      <div><Label>E-Mail für Anfragen</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><Label>Telefon</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><Label>Straße</Label><Input value={f.street} onChange={(e) => setF({ ...f, street: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-2"><div><Label>PLZ</Label><Input value={f.plz} onChange={(e) => setF({ ...f, plz: e.target.value })} /></div><div className="col-span-2"><Label>Ort</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div></div>
      <div><Label>Website</Label><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://" /></div>
      <div><Label>Handwerksrollen-Nr. (für Verifizierung)</Label><Input value={f.handwerksrolle_nr} onChange={(e) => setF({ ...f, handwerksrolle_nr: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Gewerke</Label><div className="mt-2 flex flex-wrap gap-2">{TRADES.map((t) => <button type="button" key={t.slug} onClick={() => toggleTrade(t.slug)} className={`rounded-full border px-3 py-1 text-sm ${f.trades.includes(t.slug) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button>)}</div></div>
      <div className="sm:col-span-2"><Label>PLZ-Gebiete (zweistellig, durch Komma getrennt; leer = bundesweit)</Label><Input value={f.regions} onChange={(e) => setF({ ...f, regions: e.target.value })} placeholder="74, 91, 73" /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? <Spinner className="text-white" /> : "Speichern"}</Button></div>
    </form>
  );
}
