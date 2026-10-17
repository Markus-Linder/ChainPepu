"use client";
import { useEffect, useState } from "react";

export function Countdown({ seconds }: { seconds: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setS((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return <span className="font-mono tabular-nums">{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}</span>;
}
