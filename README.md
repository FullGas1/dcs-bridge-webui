![dcs-bridge-webui banner](frontend/public/banner.jpg)

A local, turnkey web UI for live-debugging a running DCS mission through
[VEAF-dcs-bridge](https://github.com/VEAF/dcs-bridge): paste Lua snippets into on-page editors
and inject them into the mission, one at a time. See [CONTEXT.md](CONTEXT.md) for the full
glossary (Widget, Injection, Result, Template, etc.) and `docs/adr/` for the design decisions
behind it.

## Prerequisites

This tool is a **client**, not the bridge itself. Before it can do anything, DCS needs its own
side of the connection running:

1. **[VEAF-dcs-bridge](https://github.com/VEAF/dcs-bridge)** — `dcs-bridge.lua`, loaded into your
   mission (see that repo's README for the two supported methods: `MissionScripting.lua` or a
   `DO SCRIPT FILE` trigger).
2. **DCS's Lua sandbox must be de-sanitized** for `dcs-bridge.lua` to work at all — it needs
   `package`/`require` (and `io`/`os`/`lfs`), which DCS strips by default. Edit
   `<your DCS install>\Scripts\MissionScripting.lua` and comment out the `sanitizeModule(...)`
   calls (and `_G['require'] = nil` / `_G['package'] = nil`) in its `Sanitize Mission Scripting
   environment` block.
   > ⚠️ **A DCS update silently re-sanitizes this file** (confirmed: DCS's own updater backs up
   > and reinstalls `Scripts/MissionScripting.lua` on every version update). If the connection
   > that used to work suddenly can't reach `dcs-serve` after updating DCS, redo this step first.
3. **`dcs-serve`** (also from VEAF-dcs-bridge) running and connected to your mission — its own
   console should show `TCP server listening on ('127.0.0.1', 7777)` and `Uvicorn running on
   http://0.0.0.0:8080`. A `POST /api/exec` returning `503 Service Unavailable` at this point
   means `dcs-serve` itself is reachable but no mission is currently connected to it (e.g. the
   mission is paused, or hasn't loaded `dcs-bridge.lua` yet) — not a problem with this webui.

## Getting the app

There's no published release (this project has no GitHub remote — it's local-only). Build it
from source:

```bash
powershell -ExecutionPolicy Bypass -File backend\build_exe.ps1
```

This produces `backend\dist\dcs-bridge-webui.exe` — a single file, nothing else to install
(no Python/Node needed to *run* it, only to build it). For frontend development instead of a
packaged build, see [frontend/README.md](frontend/README.md).

## Running it

Double-click `dcs-bridge-webui.exe`. It opens a console window (that window *is* the server —
closing it stops the app) and launches your browser at `http://127.0.0.1:8000`.

### First connection: finding your `api_key`

The first time you open the app (or whenever it can't reach `dcs-serve`), a banner asks for an
`api_key`. This key is generated locally by `dcs-serve` itself, not by this project, so it can't
be pre-filled:

1. Look in the folder you launched `dcs-serve` from — it writes a `dcs-serve.yaml` file there on
   first launch.
2. Open that file and copy the `api_key` value.
3. Paste it into the banner and click **Connect**.

The host/port default to `127.0.0.1:8080` (`dcs-serve`'s REST API port — distinct from the
`7777` port `dcs-bridge.lua` itself connects through). Once connected, the key is remembered
locally alongside your saved templates — you won't need to re-enter it next time.

## Using it

- Each **widget** pairs a Lua script editor with the result of its last **injection**. Add more
  widgets with the `+` tile; close one with its `×`.
- **Send** (or `Ctrl+Enter` in the editor) injects the script into the live mission; **Stop**
  cancels it. Only one injection runs against `dcs-serve` at a time across all widgets.
- A **table** return value is shown as its actual content (an indented, re-pasteable Lua
  expression), not a `table: 0x...` reference.
- **Expand**/**Collapse**, per editor and per result independently, shows the whole content with
  no cap — otherwise both size themselves to their content up to ~30 lines.
- **Memorize** saves the current script as a named **template**, reusable from any widget's
  **Templates** dropdown.
- The floating `−`/`+` control (bottom-right, always visible) or `Ctrl`+scroll anywhere on the
  page adjusts a single reading-size zoom (80%–200%) for every editor and result together.
