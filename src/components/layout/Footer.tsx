import { Link } from "react-router-dom";
import { TRADES } from "@/data/trades";
import { OWNER } from "@/data/legal";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="font-extrabold text-lg text-primary">Profiangebot</div>
          <p className="mt-2 text-sm text-muted-foreground">Handwerker-Angebote prüfen, vergleichen und Gegenangebote erhalten. Unabhängig, KI-gestützt, in Minuten.</p>
          <p className="mt-3 text-xs text-muted-foreground">{OWNER.name} · {OWNER.street} · {OWNER.zip} {OWNER.city}</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Für Kunden</div>
          <ul className="space-y-1 text-sm">
            <li><Link to="/angebot-pruefen" className="hover:underline">Angebot prüfen</Link></li>
            <li><Link to="/leistungsverzeichnis" className="hover:underline">Anfrage erstellen</Link></li>
            <li><Link to="/vergleich" className="hover:underline">Angebote vergleichen</Link></li>
            <li><Link to="/preise" className="hover:underline">Preise</Link></li>
            <li><Link to="/ratgeber" className="hover:underline">Ratgeber</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Gewerke</div>
          <ul className="space-y-1 text-sm">
            {TRADES.map((t) => (
              <li key={t.slug}><Link to={`/gewerke/${t.slug}`} className="hover:underline">{t.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Betriebe und Rechtliches</div>
          <ul className="space-y-1 text-sm">
            <li><Link to="/fuer-betriebe" className="hover:underline">Für Betriebe</Link></li>
            <li><Link to="/betriebe/login" className="hover:underline">Betriebe-Login</Link></li>
            <li><Link to="/kontakt" className="hover:underline">Kontakt</Link></li>
            <li><Link to="/impressum" className="hover:underline">Impressum</Link></li>
            <li><Link to="/datenschutz" className="hover:underline">Datenschutz</Link></li>
            <li><Link to="/agb" className="hover:underline">AGB</Link></li>
            <li><Link to="/widerruf" className="hover:underline">Widerrufsbelehrung</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Profiangebot. Alle Angaben ohne Gewähr. Keine Rechts- oder Steuerberatung.</span>
          <span>Preise verstehen sich inkl. MwSt.</span>
        </div>
      </div>
    </footer>
  );
}
