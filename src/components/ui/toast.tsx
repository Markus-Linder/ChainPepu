import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; description?: string; variant?: "default" | "success" | "error" };
type Ctx = { toast: (t: Omit<Toast, "id">) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "glass animate-fade-up pointer-events-auto rounded-2xl px-4 py-3 text-sm",
              t.variant === "success" && "border-success/40",
              t.variant === "error" && "border-destructive/50",
            )}
          >
            <div className="font-semibold">{t.title}</div>
            {t.description && <div className="text-muted-foreground">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
