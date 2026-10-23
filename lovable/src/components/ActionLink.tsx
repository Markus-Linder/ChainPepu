import { MouseEvent, PropsWithChildren } from "react";

type Props = PropsWithChildren<{ href: string; className?: string; missingHint: string }>;

/** A CTA that works when its URL is configured and explains itself when it is not. */
export default function ActionLink({ href, className = "btn", missingHint, children }: Props) {
  const onClick = (e: MouseEvent) => {
    if (!href) { e.preventDefault(); alert(missingHint); }
  };
  return (
    <a href={href || "#"} onClick={onClick} className={className} target={href ? "_blank" : undefined} rel={href ? "noreferrer" : undefined}>
      {children}
    </a>
  );
}
