import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "pass" | "fail" | "muted" | "critical" | "high" | "medium" | "low";

const tones: Record<Tone, string> = {
  default: "bg-secondary text-secondary-foreground",
  pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  fail: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  muted: "bg-muted text-muted-foreground",
  critical: "bg-red-600 text-white",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
