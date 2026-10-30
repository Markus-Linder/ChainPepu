import { Link, NavLink } from "react-router-dom";
import { Menu, X, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/angebot-pruefen", label: "Angebot prüfen" },
  { to: "/leistungsverzeichnis", label: "Anfrage erstellen" },
  { to: "/vergleich", label: "Vergleichen" },
  { to: "/gewerke", label: "Gewerke" },
  { to: "/ratgeber", label: "Ratgeber" },
  { to: "/fuer-betriebe", label: "Für Betriebe" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-primary" onClick={() => setOpen(false)}>
          <CheckCircle2 className="h-6 w-6" /> Profiangebot
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn("rounded-md px-3 py-2 text-sm font-medium hover:bg-muted", isActive && "bg-secondary text-secondary-foreground")}>
              {n.label}
            </NavLink>
          ))}
          <Button asChild size="sm" className="ml-2">
            <Link to="/angebot-pruefen">Kostenlos prüfen</Link>
          </Button>
        </nav>
        <button className="md:hidden p-2" aria-label="Menü" onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="container flex flex-col py-2">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className="px-2 py-3 text-sm font-medium border-b last:border-0">
                {n.label}
              </NavLink>
            ))}
            <Button asChild className="my-3">
              <Link to="/angebot-pruefen" onClick={() => setOpen(false)}>Kostenlos prüfen</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
