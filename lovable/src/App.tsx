import { Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import Home from "@/pages/Home";
import Heute from "@/pages/Heute";
import Ketten from "@/pages/Ketten";
import Kette from "@/pages/Kette";
import PlanetPage from "@/pages/PlanetPage";
import Neu from "@/pages/Neu";
import Shop from "@/pages/Shop";
import ShopErfolg from "@/pages/ShopErfolg";
import Login from "@/pages/Login";
import Registrieren from "@/pages/Registrieren";
import Einladung from "@/pages/Einladung";
import NotFound from "@/pages/NotFound";
import Mitteilungen from "@/pages/Mitteilungen";
import Moderation from "@/pages/Moderation";
import Regeln from "@/pages/Regeln";

export default function App() {
  return (
    <AuthProvider>
      <div className="stars-bg" />
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/heute" element={<Heute />} />
          <Route path="/ketten" element={<Ketten />} />
          <Route path="/c/:id" element={<Kette />} />
          <Route path="/p/:username" element={<PlanetPage />} />
          <Route path="/neu" element={<Neu />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/erfolg" element={<ShopErfolg />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registrieren" element={<Registrieren />} />
          <Route path="/einladung/:token" element={<Einladung />} />
          <Route path="/mitteilungen" element={<Mitteilungen />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/regeln" element={<Regeln />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="muted mx-auto max-w-6xl px-4 py-10 text-center text-xs">ChainPepu · Kostenlos für alle · Jeder Mensch ist ein Planet · <Link to="/regeln" className="underline">Regeln</Link></footer>
    </AuthProvider>
  );
}
