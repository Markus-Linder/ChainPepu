import { useState } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LangProvider, LangSwitcher, useT } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { UsernameForm } from "@/components/Forms";
import { ZeitketteStrip } from "@/components/Zeitkette";
import { Logo } from "@/components/Icons";
import Home from "@/pages/Home";
import Today from "@/pages/Today";
import Chains from "@/pages/Chains";
import Chain from "@/pages/Chain";
import PlanetPage from "@/pages/PlanetPage";
import NewChain from "@/pages/NewChain";
import Shop from "@/pages/Shop";
import Notifications from "@/pages/Notifications";
import Moderation from "@/pages/Moderation";
import Rules from "@/pages/Rules";
import About from "@/pages/About";
import Arena from "@/pages/Arena";
import Stream from "@/pages/Stream";
import Dashboard from "@/pages/Dashboard";
import Leaderboards from "@/pages/Leaderboards";
import Tournaments, { TournamentPage } from "@/pages/Tournaments";
import Admin from "@/pages/Admin";
import NotFound, { Invite, Login, ShopSuccess, Signup } from "@/pages/Small";

/** Old German paths keep working (links in the wild, QR codes, bookmarks). */
function InviteRedirect() { return <Navigate to={`/invite/${useParams().token}`} replace />; }

/** After a Google/Apple login the planet still has a generated name: ask once for username and display name. */
function UsernameGate() {
  const { t } = useT();
  const { profile } = useAuth();
  const [done, setDone] = useState(false);
  if (!profile || done || !profile.username.startsWith("planet_")) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
      <div className="card card-glow w-full max-w-sm p-6">
        <Logo />
        <h2 className="mt-4 text-xl font-bold">{t("welcome_title")}</h2>
        <p className="muted mb-4 text-sm">{t("welcome_text")}</p>
        <UsernameForm onDone={() => setDone(true)} />
      </div>
    </div>
  );
}

function Footer() {
  const { t } = useT();
  const col = "space-y-2 text-sm";
  const link = "muted block hover:text-white";
  return (
    <footer className="mt-20 border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="muted mt-3 max-w-xs text-sm">{t("hero_text")}</p>
          <div className="mt-4"><LangSwitcher /></div>
        </div>
        <div className={col}><p className="kicker mb-3">{t("footer_product")}</p><Link to="/stream" className={link}>{t("nav_stream")}</Link><Link to="/today" className={link}>{t("nav_today")}</Link><Link to="/chains" className={link}>{t("nav_chains")}</Link><Link to="/leaderboards" className={link}>{t("board_title")}</Link><Link to="/tournaments" className={link}>{t("tour_title")}</Link></div>
        <div className={col}><p className="kicker mb-3">{t("footer_creators")}</p><Link to="/new" className={link}>{t("nav_start_chain")}</Link><Link to="/new?topic=1" className={link}>{t("new_topic_title")}</Link><Link to="/dashboard" className={link}>{t("dash_title")}</Link><Link to="/shop" className={link}>{t("nav_shop")}</Link></div>
        <div className={col}><p className="kicker mb-3">{t("footer_company")}</p><Link to="/about" className={link}>{t("footer_about")}</Link><Link to="/rules" className={link}>{t("footer_rules")}</Link></div>
      </div>
      <p className="muted border-t border-white/10 px-4 py-5 text-center text-xs">ChainPepu · {t("footer")}</p>
    </footer>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <div className="stars-bg" />
        <div className="noise" />
        <Nav />
        <ZeitketteStrip />
        <UsernameGate />
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/today" element={<Today />} />
            <Route path="/chains" element={<Chains />} />
            <Route path="/c/:id" element={<Chain />} />
            <Route path="/p/:username" element={<PlanetPage />} />
            <Route path="/new" element={<NewChain />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/success" element={<ShopSuccess />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/invite/:token" element={<Invite />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/moderation" element={<Moderation />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/about" element={<About />} />
            <Route path="/duel/:id" element={<Arena />} />
            <Route path="/stream" element={<Stream />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournament/:id" element={<TournamentPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/heute" element={<Navigate to="/today" replace />} />
            <Route path="/ketten" element={<Navigate to="/chains" replace />} />
            <Route path="/neu" element={<Navigate to="/new" replace />} />
            <Route path="/registrieren" element={<Navigate to="/signup" replace />} />
            <Route path="/einladung/:token" element={<InviteRedirect />} />
            <Route path="/mitteilungen" element={<Navigate to="/notifications" replace />} />
            <Route path="/regeln" element={<Navigate to="/rules" replace />} />
            <Route path="/shop/erfolg" element={<Navigate to="/shop/success" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </LangProvider>
  );
}
