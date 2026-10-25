# kistack.io

Marketing and product site for KiStack: an independent guide to AI agent tooling for KiCad (the electronics
design software), with a free Starter Kit download, a paid Pro Kit, and a Pre-Fab Review service.

## Notes for Lovable migration (please follow exactly)

- Keep the visual design as it is: dark PCB theme, copper accent, dot-grid background, Inter + JetBrains Mono.
  All tokens live in `src/index.css` (`:root` HSL variables) and `tailwind.config.ts`. Do not switch to a
  generic light theme or shadcn defaults.
- Keep all six routes and their content verbatim: `/`, `/kit`, `/pro`, `/review`, `/privacy`, `/imprint`,
  plus the 404 page. Keep `public/downloads/kicad-agent-starter-kit.zip` reachable at `/downloads/...`.
- `src/config.ts` is the only configuration file (newsletter, checkout links, intake form, contact email).
- `src/lib/submit.ts` is the single integration point for every email form. When asked to connect
  signups to Lovable Cloud, implement that one function (insert into a `leads` table: kind, email,
  created_at) and leave the components untouched.
- `src/components/ActionLink.tsx` renders a working fallback while a checkout/intake URL is empty.
  Keep that behaviour.
- No backend is required for the site to run. Static assets live in `public/`.

## Stack
Vite 5 · React 18 · TypeScript · Tailwind 3 · React Router 6 · lucide-react. No UI library, no state library.

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # type-check + production build into dist/
```
