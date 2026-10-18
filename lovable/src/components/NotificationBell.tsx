import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { countUnread } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function NotificationBell() {
  const { session } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const load = () => countUnread().then((c) => { if (alive) setN(c); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [session]);
  if (!session) return null;
  return (
    <Link to="/mitteilungen" className="relative text-lg" title="Mitteilungen" aria-label={`Mitteilungen, ${n} ungelesen`}>
      🔔
      {n > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-[#ff5cc8] px-1.5 text-[10px] font-bold text-white">{n > 99 ? "99+" : n}</span>}
    </Link>
  );
}
