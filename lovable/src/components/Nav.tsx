import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Planet } from "./Planet";

export function Nav() {
  const { profile } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(5,4,15,0.75)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff5cc8]" />
          ChainPepu
        </Link>
        <nav className="ml-2 hidden items-center gap-4 text-sm sm:flex">
          <Link to="/" className="muted hover:text-white">Universum</Link>
          <Link to="/heute" className="muted hover:text-white">Heute</Link>
          <Link to="/ketten" className="muted hover:text-white">Ketten</Link>
          <Link to="/shop" className="muted hover:text-white">Shop</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <Link to="/neu" className="btn whitespace-nowrap text-sm">+ Kette starten</Link>
              <Link to="/shop" className="hidden items-center gap-1 text-sm sm:flex" title="Deine Sterne">
                <span style={{ color: "var(--star)" }}>★</span> {profile.stars}
              </Link>
              <Link to={`/p/${profile.username}`} className="flex items-center gap-2" title="Dein Planet">
                <Planet seed={profile.planet_seed} skin={profile.planet_skin} size={34} />
                <span className="hidden text-sm sm:inline">{profile.display_name}</span>
              </Link>
              <button className="btn btn-ghost text-xs" onClick={() => supabase.auth.signOut()}>Abmelden</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost whitespace-nowrap text-sm">Anmelden</Link>
              <Link to="/registrieren" className="btn whitespace-nowrap text-sm">Planet erstellen</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex justify-around border-t border-white/10 py-2 text-xs sm:hidden">
        <Link to="/">Universum</Link>
        <Link to="/heute">Heute</Link>
        <Link to="/ketten">Ketten</Link>
        <Link to="/shop">Shop</Link>
      </nav>
    </header>
  );
}
