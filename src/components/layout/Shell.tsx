import { Link, NavLink, useNavigate } from "react-router-dom";
import { Coins, Globe, LogOut, Sparkles, Swords, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { BRAND } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { profile, user, isAnonymous, signOut } = useAuth();
  const navigate = useNavigate();
  const loggedIn = Boolean(user && !isAnonymous);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
              <Sparkles size={18} />
            </span>
            <span className="gradient-text">{BRAND.name}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavItem to="/arena" icon={<Swords size={16} />}>{t.app.arena}</NavItem>
            <NavItem to="/pricing" icon={<Coins size={16} />}>{t.app.pricing}</NavItem>
            {loggedIn && <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />}>{t.app.dashboard}</NavItem>}
          </nav>
          <div className="flex items-center gap-2">
            <label className="chip cursor-pointer gap-2">
              <Globe size={14} />
              <select className="bg-transparent text-xs outline-none" value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} aria-label={t.app.language}>
                {LOCALES.map((l) => (
                  <option key={l} value={l} className="bg-background">{LOCALE_LABELS[l]}</option>
                ))}
              </select>
            </label>
            {profile && (
              <Link to="/pricing" className="chip gap-1 border-warning/30 text-warning" title={t.app.buy_credits}>
                <Coins size={14} /> {profile.credits.toLocaleString(locale)}
              </Link>
            )}
            {loggedIn ? (
              <button className="btn-ghost hidden sm:inline-flex" onClick={async () => { await signOut(); navigate("/"); }} title={t.app.logout}>
                <LogOut size={16} />
              </button>
            ) : (
              <Link to="/login" className="btn-primary px-4 py-2 text-sm">{t.app.cta_creator}</Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-muted-foreground">
        <div className="container flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {BRAND.legalEntity}. {t.pricing.revenue_note}</span>
          <div className="flex gap-4">
            <Link to="/arena" className="hover:text-foreground">{t.app.arena}</Link>
            <Link to="/pricing" className="hover:text-foreground">{t.app.pricing}</Link>
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-foreground">{BRAND.supportEmail}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn("btn-ghost text-sm", isActive && "bg-white/10 text-foreground")}>
      {icon}
      {children}
    </NavLink>
  );
}
