import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { SEO } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";

export default function BetriebeLogin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [tab, setTab] = useState(params.get("tab") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/betriebe/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "login") {
        const { error } = await signIn(email, pw);
        if (error) throw error;
        navigate("/betriebe/dashboard");
      } else {
        if (pw.length < 8) throw new Error("Passwort mindestens 8 Zeichen.");
        const { data, error } = await signUp(email, pw);
        if (error) throw error;
        if (data.session) navigate("/betriebe/dashboard");
        else toast.success("Bitte bestätigen Sie Ihre E-Mail-Adresse. Wir haben Ihnen einen Link geschickt.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) return toast.error("Bitte E-Mail eingeben.");
    const { error } = await resetPassword(email);
    if (error) toast.error(error.message);
    else toast.success("Link zum Zurücksetzen gesendet.");
  };

  return (
    <>
      <SEO title="Betriebe-Login" description="Anmeldung für Handwerksbetriebe." path="/betriebe/login" noindex />
      <div className="container py-16 max-w-md">
        <Card><CardContent className="p-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full"><TabsTrigger className="flex-1" value="login">Anmelden</TabsTrigger><TabsTrigger className="flex-1" value="register">Registrieren</TabsTrigger></TabsList>
            <TabsContent value="login"><h1 className="mt-4 text-xl font-bold">Willkommen zurück</h1></TabsContent>
            <TabsContent value="register"><h1 className="mt-4 text-xl font-bold">Betrieb registrieren</h1><p className="text-sm text-muted-foreground">Kostenlos. Danach legen Sie Ihr Profil mit Gewerken und Region an.</p></TabsContent>
          </Tabs>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><Label htmlFor="em">E-Mail</Label><Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div><Label htmlFor="pw">Passwort</Label><Input id="pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={tab === "login" ? "current-password" : "new-password"} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <Spinner className="text-white" /> : tab === "login" ? "Anmelden" : "Konto anlegen"}</Button>
            {tab === "login" && <button type="button" onClick={reset} className="text-sm underline text-muted-foreground">Passwort vergessen?</button>}
            {tab === "register" && <p className="text-xs text-muted-foreground">Mit der Registrierung akzeptieren Sie unsere <a className="underline" href="/agb" target="_blank" rel="noreferrer">AGB</a> und <a className="underline" href="/datenschutz" target="_blank" rel="noreferrer">Datenschutzerklärung</a>.</p>}
          </form>
        </CardContent></Card>
      </div>
    </>
  );
}
