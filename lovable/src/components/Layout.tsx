import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Github, Menu, X } from "lucide-react";

const nav = [
  { to: "/#install", label: "Install" },
  { to: "/#compare", label: "Compare" },
  { to: "/kit", label: "Free Kit" },
  { to: "/pro", label: "Pro Kit" },
  { to: "/review", label: "Review" },
];

export default function Layout() {
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (hash) {
      const el = document.querySelector(hash);
      if (el) { setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  const linkCls = (active: boolean) => `rounded-md px-3 py-2 text-sm font-medium transition ${active ? "text-fg" : "text-muted hover:text-fg"}`;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--copper)/.14),transparent_70%)]" />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="text-[17px] font-bold tracking-tight text-fg">Ki<span className="text-copper">Stack</span><span className="text-muted">.io</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => n.to.includes("#")
              ? <a key={n.to} href={n.to} className={linkCls(false)}>{n.label}</a>
              : <NavLink key={n.to} to={n.to} className={({ isActive }) => linkCls(isActive)}>{n.label}</NavLink>)}
            <a href="https://github.com/American-Embedded/KiStack" className="ml-2 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-muted transition hover:border-copper/50 hover:text-fg" rel="noreferrer"><Github className="h-4 w-4" /> GitHub</a>
          </nav>
          <button className="rounded-md p-2 text-muted hover:text-fg md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="container flex flex-col gap-1 border-t border-line py-3 md:hidden">
            {nav.map((n) => n.to.includes("#")
              ? <a key={n.to} href={n.to} className={linkCls(false)} onClick={() => setOpen(false)}>{n.label}</a>
              : <NavLink key={n.to} to={n.to} className={({ isActive }) => linkCls(isActive)}>{n.label}</NavLink>)}
          </nav>
        )}
      </header>
      <main className="container"><Outlet /></main>
      <footer className="mt-10 border-t border-line">
        <div className="container grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2"><img src="/favicon.svg" alt="" className="h-6 w-6" /><span className="font-bold">Ki<span className="text-copper">Stack</span>.io</span></div>
            <p className="max-w-md text-[13px] leading-relaxed text-muted">Independent guide to AI agent tooling for KiCad. Not affiliated with the KiCad project, American-Embedded or any skill pack author. KiCad is a trademark of the KiCad project. Fab names belong to their respective owners.</p>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Products</div>
            <ul className="space-y-2 text-muted"><li><Link to="/kit" className="hover:text-fg">Free Starter Kit</Link></li><li><Link to="/pro" className="hover:text-fg">Pro Kit</Link></li><li><Link to="/review" className="hover:text-fg">Pre-Fab Review</Link></li></ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Legal</div>
            <ul className="space-y-2 text-muted"><li><Link to="/imprint" className="hover:text-fg">Imprint</Link></li><li><Link to="/privacy" className="hover:text-fg">Privacy</Link></li><li><a href="https://github.com/American-Embedded/KiStack" className="hover:text-fg" rel="noreferrer">KiStack on GitHub</a></li></ul>
          </div>
        </div>
      </footer>
    </>
  );
}
