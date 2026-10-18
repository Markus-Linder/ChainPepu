import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { StartChainForm } from "@/components/Forms";
import { Loading } from "@/lib/useAsync";

export default function NewChain() {
  const { t } = useT();
  const { profile, loading } = useAuth();
  const topic = useSearchParams()[0].get("topic") === "1";
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/new" replace />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{topic ? t("new_topic_title") : t("new_title")}</h1>
      <p className="muted text-sm">{topic ? t("topic_hint") : t("new_text")}</p>
      <div className="card p-5"><StartChainForm topic={topic} /></div>
    </div>
  );
}
