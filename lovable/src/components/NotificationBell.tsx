import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { countUnread } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Icon } from "./Icons";

export function NotificationBell() {
  const { session } = useAuth();
  const { t } = useT();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const load = () => countUnread().then((c) => { if (alive) setN(c); }).catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [session]);
  if (!session) return null;
  return (
    <Link to="/notifications" className="relative muted hover:text-white" title={t("nav_notifications")} aria-label={`${t("nav_notifications")}, ${n}`}>
      <Icon name="bell" size={20} />
      {n > 0 && <span className="absolute -right-2 -top-1.5 rounded-full bg-[#ff3d9a] px-1.5 text-[10px] font-bold text-white">{n > 99 ? "99+" : n}</span>}
    </Link>
  );
}
