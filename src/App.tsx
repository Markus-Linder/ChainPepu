import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Spinner } from "@/components/ui/spinner";
import Home from "@/pages/Home";

const AngebotPruefen = lazy(() => import("@/pages/AngebotPruefen"));
const Bericht = lazy(() => import("@/pages/Bericht"));
const Vergleich = lazy(() => import("@/pages/Vergleich"));
const VergleichErgebnis = lazy(() => import("@/pages/VergleichErgebnis"));
const Leistungsverzeichnis = lazy(() => import("@/pages/Leistungsverzeichnis"));
const LvAnsicht = lazy(() => import("@/pages/LvAnsicht"));
const Preise = lazy(() => import("@/pages/Preise"));
const Kontakt = lazy(() => import("@/pages/Kontakt"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const GewerkeIndex = lazy(() => import("@/pages/gewerke/GewerkeIndex"));
const GewerkSeite = lazy(() => import("@/pages/gewerke/GewerkSeite"));
const GewerkStadtSeite = lazy(() => import("@/pages/gewerke/GewerkStadtSeite"));
const FuerBetriebe = lazy(() => import("@/pages/betriebe/FuerBetriebe"));
const BetriebeLogin = lazy(() => import("@/pages/betriebe/BetriebeLogin"));
const BetriebeDashboard = lazy(() => import("@/pages/betriebe/BetriebeDashboard"));
const Impressum = lazy(() => import("@/pages/rechtliches/Impressum"));
const Datenschutz = lazy(() => import("@/pages/rechtliches/Datenschutz"));
const AGB = lazy(() => import("@/pages/rechtliches/AGB"));
const Widerruf = lazy(() => import("@/pages/rechtliches/Widerruf"));
const RatgeberIndex = lazy(() => import("@/pages/ratgeber/RatgeberIndex"));
const RatgeberArtikel = lazy(() => import("@/pages/ratgeber/RatgeberArtikel"));

const Fallback = () => <div className="container py-24 flex justify-center"><Spinner className="h-8 w-8" /></div>;
const page = (el: React.ReactNode) => <Suspense fallback={<Fallback />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/angebot-pruefen", element: page(<AngebotPruefen />) },
      { path: "/bericht/:id", element: page(<Bericht />) },
      { path: "/vergleich", element: page(<Vergleich />) },
      { path: "/vergleich/:id", element: page(<VergleichErgebnis />) },
      { path: "/leistungsverzeichnis", element: page(<Leistungsverzeichnis />) },
      { path: "/leistungsverzeichnis/:id", element: page(<LvAnsicht />) },
      { path: "/preise", element: page(<Preise />) },
      { path: "/kontakt", element: page(<Kontakt />) },
      { path: "/gewerke", element: page(<GewerkeIndex />) },
      { path: "/gewerke/:trade", element: page(<GewerkSeite />) },
      { path: "/gewerke/:trade/:city", element: page(<GewerkStadtSeite />) },
      { path: "/fuer-betriebe", element: page(<FuerBetriebe />) },
      { path: "/betriebe/login", element: page(<BetriebeLogin />) },
      { path: "/betriebe/dashboard", element: page(<BetriebeDashboard />) },
      { path: "/impressum", element: page(<Impressum />) },
      { path: "/datenschutz", element: page(<Datenschutz />) },
      { path: "/agb", element: page(<AGB />) },
      { path: "/widerruf", element: page(<Widerruf />) },
      { path: "/ratgeber", element: page(<RatgeberIndex />) },
      { path: "/ratgeber/:slug", element: page(<RatgeberArtikel />) },
      { path: "*", element: page(<NotFound />) },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
