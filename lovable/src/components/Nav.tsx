import { Link, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LangSwitcher, useT } from "@/lib/i18n";
import { Planet } from "./Planet";
import { NotificationBell } from "./NotificationBell";
import { Icon, Logo, type IconName } from "./Icons";

const ITEMS: { to: string; key: string; icon: IconName }[] = [
  { to: "/", key: "nav_universe", icon: "globe" },
  { to: "/stream", key: "nav_stream", icon: "play" },
  { to: "/today", key: "nav_today", icon: "sun" },
  { to: "/chains", key: "nav_chains", icon: "chain" },
  { to: "/shop", key: "nav_shop", icon: "star" },
];

export function Nav() {
  const { profile } = useAuth();
  const { t } = useT();
  const cls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-1.5 text-sm transition ${isActive ? "text-white" : "muted hover:text-white"}`;
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(6,5,13,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" aria-label="ChainPepu"><Logo /></Link>
        <nav className="ml-3 hidden items-center gap-5 sm:flex">
          {ITEMS.map((i) => <NavLink key={i.to} to={i.to} end={i.to === "/"} className={cls}><Icon name={i.icon} size={16} />{t(i.key)}</NavLink>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LangSwitcher className="hidden sm:block" />
          {profile ? (
            <>
              <Link to="/new" className="btn whitespace-nowrap px-3 text-xs sm:px-5 sm:text-sm"><Icon name="spark" size={15} /><span className="hidden sm:inline">{t("nav_start_chain")}</span><span className="sm:hidden">+</span></Link>
              <NotificationBell />
              {profile.is_moderator && <Link to="/moderation" className="muted hover:text-white" title={t("nav_moderation")}><Icon name="shield" size={18} /></Link>}
              <Link to="/shop" className="hidden items-center gap-1 text-sm sm:flex" title={t("nav_your_stars")}>
                <span style={{ color: "var(--star)" }}><Icon name="star" size={15} filled /></span> {profile.stars}
              </Link>
              <Link to={`/p/${profile.username}`} className="flex items-center gap-2" title={t("nav_your_planet")}>
                <Planet seed={profile.planet_seed} skin={profile.planet_skin} level={profile.level} size={34} />
                <span className="hidden flex-col leading-tight sm:flex">
                  <span className="text-sm">{profile.display_name}</span>
                  <span className="muted text-[10px]">{t("level_short", { n: profile.level ?? 1 })}{profile.streak_days > 1 && <> · <Icon name="bolt" size={10} filled className="text-[#f2c46d]" />{profile.streak_days}</>}</span>
                </span>
              </Link>
              <button className="btn btn-ghost hidden text-xs sm:inline-flex" onClick={() => supabase.auth.signOut()}>{t("nav_logout")}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost hidden whitespace-nowrap text-sm sm:inline-flex">{t("nav_login")}</Link>
              <Link to="/signup" className="btn whitespace-nowrap px-3 text-xs sm:px-5 sm:text-sm">{t("nav_signup")}</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex items-center justify-around border-t border-white/10 py-2 text-[11px] sm:hidden">
        {ITEMS.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => `flex flex-col items-center gap-0.5 ${isActive ? "text-white" : "muted"}`}>
            <Icon name={i.icon} size={18} />{t(i.key)}
          </NavLink>
        ))}
        <LangSwitcher />
      </nav>
    </header>
  );
}
