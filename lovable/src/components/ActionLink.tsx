import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

type Props = PropsWithChildren<{ href: string; className?: string; fallbackTo: string; fallbackLabel: string }>;

/**
 * A CTA that opens its configured URL (checkout, intake form). While the URL is empty in
 * src/config.ts it renders a working fallback link instead, so the site never shows a dead button.
 */
export default function ActionLink({ href, className = "btn", fallbackTo, fallbackLabel, children }: Props) {
  if (!href) return <Link to={fallbackTo} className={className}>{fallbackLabel}</Link>;
  return <a href={href} className={className} target="_blank" rel="noreferrer">{children}</a>;
}
