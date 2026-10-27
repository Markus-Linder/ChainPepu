import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-mono text-sm">redteamly</span>
          </div>
          <CardTitle>Fast fertig – Supabase verbinden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Diese App braucht eine Datenbank. In Lovable: oben rechts auf{" "}
            <strong>Supabase</strong> klicken und ein Projekt verbinden. Lovable setzt dann
            automatisch die beiden Variablen <code>VITE_SUPABASE_URL</code> und{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
          <p>
            Danach einmalig die Datei <code>supabase/migrations/0001_init.sql</code> im
            Supabase-SQL-Editor ausführen und den Secret <code>ANTHROPIC_API_KEY</code> setzen.
            Die genaue Schritt-für-Schritt-Anleitung steht in <code>README.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
