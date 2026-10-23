# kistack.io

Independent guide and product line for AI agent tooling around KiCad. The site turns organic "kistack" search
traffic into a newsletter list, sells a one-time Pro Kit, offers a pre-fab review service, and collects a
waitlist for a hosted review tool.

| Folder | What |
|---|---|
| `lovable/` | The website as a Vite + React + TypeScript + Tailwind project for import into Lovable (`npm run build` to verify). Configure accounts in `src/config.ts`. |
| `site/` | The same website as plain static HTML, deploy as-is (Cloudflare Pages: output directory `site`). Configure accounts in `site/assets/config.js`. |
| `kit-free/` | KiCad Agent Starter Kit (MIT). Built into `site/downloads/kicad-agent-starter-kit.zip`. |
| `kit-pro/` | KiStack Pro Kit: fab profiles + `.kicad_dru` rule files, board-class constraint templates, prompts, agent files. Built into `dist/` for upload to Lemon Squeezy. Never publish `dist/`. |
| `tools/kistack-review/` | CLI that runs KiCad DRC/ERC/BOM, compares against fab profiles, writes a report and an agent prompt. Ships inside the Pro Kit. |
| `docs/KONZEPT.md` | Findings, strategy, pricing (German). |
| `docs/SETUP-ANLEITUNG.md` | Step-by-step launch guide for the owner (German). |
| `scripts/build.sh` | Validates data, runs tests, builds both kit zips and `dist/kistack-lovable.zip`. |

```bash
bash scripts/build.sh
python3 -m http.server -d site 8080   # preview at http://localhost:8080
```
