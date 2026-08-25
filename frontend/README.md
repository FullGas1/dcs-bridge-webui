# frontend

Svelte + Vite + TypeScript UI for dcs-bridge-webui. Talks only to the local backend
(`../backend/`) at `/api/*` — never directly to `dcs-serve`.

```bash
npm install
npm run dev     # dev server on :5173, proxies /api to the backend on :8000
npm test        # vitest
npm run build   # production build, bundled by the backend's exe packaging
```
