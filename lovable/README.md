# kistack.io (Lovable / Vite project)

React 18 + Vite + TypeScript + Tailwind + React Router. No backend needed: newsletter goes to Buttondown,
payments to Lemon Squeezy, review requests to Tally. Edit `src/config.ts` to connect them.

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # dist/
```

Pages: `/` home, `/kit` free starter kit, `/pro` paid Pro Kit, `/review` review service + waitlist, `/privacy`, `/imprint`.
Static files in `public/` (free kit zip under `public/downloads/`).
