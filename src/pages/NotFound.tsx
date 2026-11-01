import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n/client";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container py-24 text-center">
      <h1 className="text-6xl font-extrabold gradient-text">404</h1>
      <p className="mt-4 text-muted-foreground">This creature wandered off.</p>
      <Link to="/" className="btn-primary mt-8">{t.app.back}</Link>
    </div>
  );
}
