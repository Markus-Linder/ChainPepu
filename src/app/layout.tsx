import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "ChainPepu – Das Universum aus Ketten",
  description: "Starte eine Kette, lass sie durch das Universum wachsen. Kostenlos. Jeder Mensch ist ein Planet.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "ChainPepu", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#05040f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="stars-bg" />
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="muted mx-auto max-w-6xl px-4 py-10 text-center text-xs">
          ChainPepu · Kostenlos für alle · Jeder Mensch ist ein Planet
        </footer>
        <PwaRegister />
      </body>
    </html>
  );
}
