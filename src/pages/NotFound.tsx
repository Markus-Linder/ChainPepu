import { Link } from "react-router-dom";
import { SEO } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SEO title="Seite nicht gefunden" description="Diese Seite existiert nicht." path="/404" noindex />
      <div className="container py-24 text-center"><div className="text-6xl font-extrabold text-primary">404</div><h1 className="mt-4 text-2xl font-bold">Seite nicht gefunden</h1><Button asChild className="mt-6"><Link to="/">Zur Startseite</Link></Button></div>
    </>
  );
}
