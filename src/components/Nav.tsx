import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { Planet } from "./Planet";

export async function Nav() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(5,4,15,0.75)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff5cc8]" />
          ChainPepu
        </Link>
        <nav className="ml-2 hidden items-center gap-4 text-sm sm:flex">
          <Link href="/" className="muted hover:text-white">Universum</Link>
          <Link href="/heute" className="muted hover:text-white">Heute</Link>
          <Link href="/ketten" className="muted hover:text-white">Ketten</Link>
          <Link href="/shop" className="muted hover:text-white">Shop</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/neu" className="btn text-sm">+ Kette starten</Link>
              <Link href="/shop" className="hidden items-center gap-1 text-sm sm:flex" title="Deine Sterne">
                <span style={{ color: "var(--star)" }}>★</span> {user.stars}
              </Link>
              <Link href={`/p/${user.username}`} className="flex items-center gap-2" title="Dein Planet">
                <Planet seed={user.planet_seed} skin={user.planet_skin} size={34} />
                <span className="hidden text-sm sm:inline">{user.display_name}</span>
              </Link>
              <form action={logoutAction}>
                <button className="btn btn-ghost text-xs">Abmelden</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost text-sm whitespace-nowrap">Anmelden</Link>
              <Link href="/registrieren" className="btn text-sm whitespace-nowrap">Planet erstellen</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex justify-around border-t border-white/10 py-2 text-xs sm:hidden">
        <Link href="/">Universum</Link>
        <Link href="/heute">Heute</Link>
        <Link href="/ketten">Ketten</Link>
        <Link href="/shop">Shop</Link>
      </nav>
    </header>
  );
}
