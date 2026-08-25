# 08 — single-exe packaging

**Status:** open (ready-for-agent)

## What to build

Package the app as a single PyInstaller console-mode executable, mirroring
`CTLD-TOOLS-WEBAPP`'s pattern in the sibling CTLD repo: the frontend is built (Vite) and bundled
as static assets served by the backend; double-clicking the exe (or a desktop shortcut) boots
the backend and opens the default browser on the UI, with no separate install step for Python or
Node. The console window is the server's lifecycle window — closing it stops the server; no
`--noconsole`.

## Acceptance criteria

- [ ] Running the built exe with no arguments starts the backend and opens the UI in the default
      browser automatically.
- [ ] Closing the console window stops the backend.
- [ ] The exe works on a machine with neither Python nor Node installed.
- [ ] The bundled frontend is the CI-built production build, not a dev server.
- [ ] All prior slices (widgets, queue, templates, persistence, connection banner, branding)
      work identically when running from the packaged exe as they do in dev mode.

## Blocked by

- Ticket 04 (session persistence via localStorage)
- Ticket 05 (script templates)
- Ticket 06 (turnkey connection banner)
- Ticket 07 (branding header)
