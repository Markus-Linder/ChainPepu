import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, UserRound } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/onboarding";
  const { user, isAnonymous } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  if (user && !isAnonymous) {
    navigate(next, { replace: true });
    return null;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) return toast({ title: "Supabase not configured", variant: "error" });
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { handle: handle.toLowerCase().replace(/[^a-z0-9_]/g, ""), display_name: handle, locale }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        toast({ title: "✓", description: "Account created. If email confirmation is enabled, check your inbox.", variant: "success" });
        const { data } = await supabase.auth.getSession();
        if (data.session) navigate(next);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next);
      }
    } catch (err) {
      toast({ title: t.app.error_generic, description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) return toast({ title: t.app.error_generic, description: error.message, variant: "error" });
    navigate("/arena");
  };

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-extrabold">{t.app.cta_creator}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.landing.step1_text}</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && <input className="input" placeholder="@handle" value={handle} onChange={(e) => setHandle(e.target.value)} required minLength={3} maxLength={24} />}
          <input className="input" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Button className="w-full" disabled={busy}><Mail size={18} /> {mode === "signup" ? "Create account" : "Sign in"}</Button>
        </form>
        <button className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
        <Button variant="secondary" className="w-full" disabled={busy} onClick={guest}><UserRound size={18} /> Continue as guest (visit & gift)</Button>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          You connect TikTok after signing in, during hatching. <Link to="/pricing" className="underline">{t.app.pricing}</Link>
        </p>
      </Card>
    </div>
  );
}
