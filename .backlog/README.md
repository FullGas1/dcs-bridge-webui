# Backlog — dcs-bridge-webui

Local markdown backlog. One lot = one directory `<LOT-ID>/` (`PRD.md` + `tickets/`). This file
is the hand-maintained index.

### Active lots

| Lot | Status | Description | Branch |
|-----|--------|-------------|--------|
| [`FEAT-LIVE-DEBUG-CONSOLE`](FEAT-LIVE-DEBUG-CONSOLE/PRD.md) | delivered | Turnkey local web UI for live-debugging a running DCS mission through VEAF-dcs-bridge: multi-widget Lua script editors, one-at-a-time injection queue, shared script templates, single-exe distribution. | — |
| [`FEAT-TABLE-RETURN-SERIALIZATION`](FEAT-TABLE-RETURN-SERIALIZATION/PRD.md) | delivered | A table return value is stringified to a memory reference (`table: 0x...`) by the external `dcs-bridge.lua` before it ever reaches this project. The backend instead rewrites the injected code so the DCS-side Lua serializes any table return into an indented, literal Lua table expression before that happens (ADR 0004). | — |
| [`FEAT-ADAPTIVE-LAYOUT-AND-ZOOM`](FEAT-ADAPTIVE-LAYOUT-AND-ZOOM/PRD.md) | delivered | The editor and the result each reserve a fixed ~30/8-line block regardless of actual content, and only the whole widget can be expanded. Dynamic collapsed-height sizing for both, an independent Expand per area, and a single page-wide zoom (floating control + Ctrl+scroll, 80%–200%). | `feature/adaptive-layout-and-zoom` |

Future candidates → [`roadmap.md`](roadmap.md).
