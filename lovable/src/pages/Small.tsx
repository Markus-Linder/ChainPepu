/** Small pages: login, signup, invite, shop success, not found. */
import { useEffect } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getInvite } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { LoginForm, RegisterForm } from "@/components/Forms";

export function Login() {
  const { t } = useT();
  const next = useSearchParams()[0].get("next") ?? undefined;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t("login_title")}</h1>
      <div className="card p-5"><LoginForm next={next} /></div>
      <p className="muted text-center text-sm">{t("no_planet_yet")} <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">{t("create_now")}</Link></p>
    </div>
  );
}

export function Signup() {
  const { t } = useT();
  const [sp] = useSearchParams();
  const next = sp.get("next") ?? undefined;
  const invite = sp.get("invite") ?? undefined;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t("signup_title")}</h1>
      <p className="muted text-sm">{t("signup_text")}</p>
      <div className="card p-5"><RegisterForm next={next} invite={invite} /></div>
      <p className="muted text-center text-sm">{t("already")} <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">{t("login")}</Link></p>
    </div>
  );
}

export function Invite() {
  const { t } = useT();
  const token = String(useParams().token);
  const { profile } = useAuth();
  const { data: invite, loading } = useAsync(() => getInvite(token), [token]);
  if (loading) return <Loading />;
  if (!invite) return <NotFound />;
  if (profile) return <Navigate to={`/c/${invite.chain_id}`} replace />;
  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <p className="kicker">{t("invite_kicker")}</p>
      <h1 className="text-2xl font-bold">{t("invite_title", { name: invite.profiles.display_name })}</h1>
      <p className="muted">{t("invite_chain")} <span className="text-white">“{invite.chains.title}”</span></p>
      <div className="card p-5 text-left"><RegisterForm invite={token} next={`/c/${invite.chain_id}`} /></div>
      <p className="muted text-sm">{t("have_planet")} <Link to={`/login?next=/c/${invite.chain_id}`} className="underline">{t("login")}</Link></p>
    </div>
  );
}

export function ShopSuccess() {
  const { t } = useT();
  const { refresh } = useAuth();
  useEffect(() => { const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [refresh]);
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">{t("shop_success_title")}</h1>
      <p className="muted">{t("shop_success_text")}</p>
      <Link to="/shop" className="btn">{t("back_to_shop")}</Link>
    </div>
  );
}

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">{t("not_found_title")}</h1>
      <p className="muted mt-2">{t("not_found_text")}</p>
      <Link to="/" className="btn mt-6">{t("back_home")}</Link>
    </div>
  );
}
