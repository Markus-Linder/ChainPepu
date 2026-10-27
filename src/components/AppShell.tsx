import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-mono font-semibold">redteamly</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" /> Abmelden
          </Button>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
