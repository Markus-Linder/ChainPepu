import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LangProvider, LangSwitcher, useT } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
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
import NotFound, { Invite, Login, ShopSuccess, Signup } from "@/pages/Small";

/** Old German paths keep working (links in the wild, QR codes, bookmarks). */
function InviteRedirect() { return <Navigate to={`/invite/${useParams().token}`} replace />; }

function Footer() {
  const { t } = useT();
  return (
    <footer className="muted mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-10 text-center text-xs">
      <span>ChainPepu · {t("footer")}</span>
      <Link to="/rules" className="underline">{t("footer_rules")}</Link>
      <Link to="/about" className="underline">{t("footer_about")}</Link>
      <LangSwitcher />
    </footer>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <div className="stars-bg" />
        <Nav />
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
