import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, prüfe dein Postfach.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Link to="/" className="mb-2 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-mono text-sm">redteamly</span>
          </Link>
          <CardTitle>{mode === "signin" ? "Anmelden" : "Konto erstellen"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "…" : mode === "signin" ? "Anmelden" : "Registrieren"}
            </Button>
          </form>
          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-primary hover:underline"
          >
            {mode === "signin" ? "Noch kein Konto? Registrieren" : "Schon registriert? Anmelden"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
