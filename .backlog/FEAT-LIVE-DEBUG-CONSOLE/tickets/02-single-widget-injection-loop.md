# 02 — single-widget injection loop

**Status:** done

## What to build

The first end-to-end frontend slice: a single widget on the page — a CodeMirror 6 editor with
Lua syntax highlighting, a send button, and Ctrl+Enter support while the editor has focus —
wired to ticket 01's proxy endpoint. Below the editor, a result area shows a one-line status
(idle / running / success / error / timeout, with elapsed time once known) and the raw string
body returned by `dcs-serve` (or the raw error on an HTTP-level failure — distinguishable from a
Lua-level error the script itself returns). The widget shows a running-state icon while an
injection is in flight, and a stop button that aborts it. An in-flight injection that exceeds a
fixed 30s timeout (matching the default already used by `tools/integration-runner/run_scenarios.py`
in the CTLD repo) is marked as timed out automatically.

Only one widget exists in this slice — the grid, queue, and multi-widget mechanics are ticket 03.

## Acceptance criteria

- [ ] Pasting a Lua snippet and clicking send (or pressing Ctrl+Enter with the editor focused)
      injects it via the ticket 01 endpoint and displays the raw result below the editor.
- [ ] The editor shows Lua syntax highlighting.
- [ ] While an injection is in flight, the widget shows a running indicator; on completion it
      reverts to idle and shows the result + a status line with elapsed time.
- [ ] Clicking stop while an injection is in flight aborts it and returns the widget to idle.
- [ ] An injection that doesn't resolve within 30s is automatically marked as timed out and the
      widget returns to idle.
- [ ] An HTTP-level failure (e.g. connection refused, 5xx) renders visibly differently from a
      normal result body containing a Lua-side error string.

## Blocked by

- Ticket 01 (backend skeleton, config store, injection proxy)
