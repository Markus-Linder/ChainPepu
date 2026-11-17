import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

// ChainPepu – die begehbare Suchmaschine.
// Die 3D-Welt ist reines Browser-JavaScript (Three.js) unter /world/ und wird erst
// im Browser gestartet. Die Seite selbst liefert nur den Rahmen (SSR-sicher).
const IMPORT_MAP = JSON.stringify({
  imports: {
    three: "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: "/world/style.css" },
      { rel: "canonical", href: "https://chainpepu.higgsfield.app/" },
    ],
    scripts: [{ type: "importmap", children: IMPORT_MAP }],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    if (document.getElementById("chainpepu-main")) return;
    const s = document.createElement("script");
    s.type = "module";
    s.id = "chainpepu-main";
    s.src = "/world/main.js";
    document.body.appendChild(s);
  }, []);

  return (
    <main id="chainpepu" lang="de">
      <noscript>ChainPepu braucht JavaScript und WebGL.</noscript>
    </main>
  );
}
