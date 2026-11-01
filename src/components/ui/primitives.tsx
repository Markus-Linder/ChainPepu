import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-3xl p-5", className)} {...props} />;
}

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const base = variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : "btn-ghost";
  return <button className={cn(base, className)} {...props} />;
}

export function Badge({ className, children, tone = "default" }: { className?: string; children: ReactNode; tone?: "default" | "success" | "warning" | "danger" | "primary" }) {
  const tones = {
    default: "",
    success: "border-success/40 text-success",
    warning: "border-warning/40 text-warning",
    danger: "border-destructive/40 text-destructive",
    primary: "border-primary/40 text-primary",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon?: ReactNode }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className={cn("tabular-nums", v < 25 && "text-destructive font-semibold")}>{v}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-primary", className)} />;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="glass animate-pop w-full max-w-lg rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="mb-4 text-xl font-bold">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
