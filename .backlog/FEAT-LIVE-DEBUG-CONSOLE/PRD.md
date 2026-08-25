# FEAT-LIVE-DEBUG-CONSOLE — turnkey web UI for live DCS debugging over dcs-bridge

**Status:** ready-for-agent.

## Problem Statement

Debugging a live DCS mission through VEAF-dcs-bridge today means either driving `exec_lua` by
hand from inside an AI coding session, or writing a throwaway script against `dcs-serve`'s REST
API. There is no lightweight, standalone way for someone to paste a Lua snippet and see what it
does against a running mission without an AI agent in the loop, and no way to keep several
debug scripts around side by side while iterating.

## Solution

A local, turnkey web UI, distributed as a single executable: download it, double-click (or a
desktop shortcut) opens the UI in the browser — no Python/Node install, no manual setup. The
page holds a responsive grid of independent **widgets**, each a small Lua editor paired with a
result pane, so several scripts stay open at once and get injected into the live mission one at
a time. A shared library of named script **templates** avoids retyping common debug scripts. A
local backend proxies every **injection** to `dcs-serve`, so the connection's `api_key` never
reaches the browser.

## User Stories

1. As a mission debugger, I want to paste a Lua script into a widget and inject it into the live
   DCS mission, so that I can inspect or manipulate mission state without leaving the browser.
2. As a mission debugger, I want to trigger an injection either by clicking a "send" button or
   pressing Ctrl+Enter while the widget's editor has focus, so that I can iterate quickly from
   the keyboard.
3. As a mission debugger, I want to see the raw result returned by `dcs-serve` right below the
   widget that sent it, so that I can read the outcome without switching context.
4. As a mission debugger, I want a status line (success/error/timeout + elapsed time) alongside
   the raw result, so that I can spot a slow or failing injection without parsing the body.
5. As a mission debugger, I want to open several widgets at once, each with its own script and
   result, so that I can keep multiple debug scripts side by side instead of overwriting one.
6. As a mission debugger, I want each widget's editor to have Lua syntax highlighting, so that I
   can read and edit scripts comfortably.
7. As a mission debugger, I want each widget to have a reasonable default size, so that the grid
   stays readable with several widgets open.
8. As a mission debugger, I want to expand a widget in place within the grid to see more of its
   script, so that I can work on a longer script without losing the others from view.
9. As a mission debugger, I want to expand several widgets at the same time, sharing the
   available space, so that I can compare two longer scripts side by side.
10. As a mission debugger, I want each widget to have its own internal scrollbar, so that I can
    navigate a script or result too long for the widget's current size.
11. As a mission debugger, I want the page itself to scroll vertically, so that I can reach
    widgets below the fold when many are open.
12. As a mission debugger, I want each widget numbered ("Widget 1", "Widget 2"...), so that I
    can tell them apart at a glance without naming them myself.
13. As a mission debugger, I want a close button on each widget, so that I can get rid of ones I
    no longer need.
14. As a mission debugger, I want a "+" control below the last widget in the grid, so that I can
    add a new empty widget when I need one.
15. As a mission debugger, I want the grid to always show at least one widget (a "+" placeholder
    if I close them all), so that I'm never stuck with no way to add one.
16. As a mission debugger, I want a fresh install to open with one empty widget already present,
    so that I can start pasting a script immediately.
17. As a mission debugger, I want my open widgets and their script content to survive a page
    reload, so that an accidental F5 doesn't wipe out scripts I haven't saved as templates.
18. As a mission debugger, I want to save the script currently in a widget as a named template,
    so that I can reuse it later without retyping it.
19. As a mission debugger, I want to be prompted for a name when I save a template, so that I
    can identify it later in the list.
20. As a mission debugger, I want a dropdown of saved templates on every widget, so that I can
    load any of them into that widget with one click.
21. As a mission debugger, I want the template list to be identical across every open widget, so
    that a template saved from one widget is immediately available in all the others.
22. As a mission debugger, I want to delete a template from the dropdown, so that I can clean up
    ones I no longer need.
23. As a mission debugger, I want only one injection to run against the mission at a time,
    queued in trigger order, so that two scripts injected close together don't race each other
    inside DCS.
24. As a mission debugger, I want each widget to show whether it's idle, queued, or running, so
    that I know what's happening without guessing.
25. As a mission debugger, I want a stop button on each widget, so that I can cancel its place in
    the queue or its in-flight injection if it's stuck.
26. As a mission debugger, I want a queued or running injection to time out automatically after a
    fixed delay, so that one bad script can't block every other widget indefinitely.
27. As a mission debugger, I want the queue to move on automatically after a timeout or
    cancellation, so that I never have to manually unstick it.
28. As a mission debugger, I want to download one executable and run it (or a desktop shortcut)
    with nothing else to install, so that I don't need Python, Node, or manual setup.
29. As a mission debugger, I want double-clicking the executable to start the local server and
    open the UI in my browser automatically, so that I never type a command or a URL.
30. As a mission debugger, I want the connection to `dcs-serve` pre-filled with the common
    default (`127.0.0.1:8080`), so that the most common single-PC setup works with zero config.
31. As a mission debugger, I want a banner to appear whenever the app can't reach `dcs-serve`,
    prompting me to paste the `api_key`, so that I can get connected without a settings screen.
32. As a mission debugger, I want the banner to tell me exactly where to find the `api_key`
    (`dcs-serve.yaml`, in the folder I launched `dcs-serve` from), so that I'm not left guessing.
33. As a mission debugger, I want the `api_key` field to accept any pasted text with no format
    validation, so that a future change in `dcs-serve`'s key format doesn't lock me out.
34. As a mission debugger, I want the `api_key` I enter to be remembered locally after I close
    and reopen the app, so that I don't have to paste it again every session.
35. As a maintainer, I want the backend to hold the `api_key` and proxy every call to
    `dcs-serve`, so that the key never appears in the browser's client-side code or devtools.
36. As a maintainer, I want templates and the `api_key` stored in a local, gitignored file, so
    that personal debug scripts and secrets never end up versioned or shared.
37. As a mission debugger, I want a generic, non-trademarked visual at the top of the page
    evoking DCS and the bridge, so that the tool has an identity with no legal risk from using
    official DCS World/Eagle Dynamics assets.
38. As a mission debugger, I want an HTTP-level failure from `dcs-serve` (e.g. a 504 timeout) to
    read differently in the result panel from a Lua-level error in my own script, so that I know
    whether to fix my script or check `dcs-serve`/the mission itself.

## Implementation Decisions

- **Architecture** (ADR 0001): the browser never talks to `dcs-serve` directly. Every call goes
  through a local FastAPI backend, which holds the `api_key` and proxies to `dcs-serve`'s REST
  API (`POST /api/exec`, `Authorization: Bearer <api_key>`).
- **Distribution** (ADR 0002): single PyInstaller console-mode executable, mirroring
  `CTLD-TOOLS-WEBAPP`'s pattern — console window doubles as the server-lifecycle window ("close
  to quit"), no `--noconsole`. Frontend built at CI and bundled as static assets.
- **Tech stack** (ADR 0003): backend FastAPI (Python); frontend Svelte + Vite + TypeScript;
  editor component CodeMirror 6 with Lua language support.
- **Connection defaults**: `host=127.0.0.1`, `port=8080` pre-filled — matches `dcs-serve`'s
  `http_port` default, distinct from its `tcp_port` (mission-side TCP link, not used here).
- **Reconnection banner**: shown whenever the backend cannot reach `dcs-serve` (connection
  failure, or an auth error from a bad key) — not only on a literal first run. Plain single-line
  text field for the `api_key`, no client-side format validation, static help text pointing to
  `dcs-serve.yaml`. Persisted once a call using it succeeds.
- **Local persistence store** (backend): one gitignored local file holding the `api_key`, any
  host/port override, and the template list (name + script text). Never committed, never synced.
- **Widget anatomy**: CodeMirror editor (Lua mode) + result pane below it + header row (widget
  number, running-state icon, stop button, close button, template dropdown, "memorize" button,
  expand toggle).
- **Expand behavior**: in-place only — an expanded widget grows its grid span/height and the
  grid reflows; several widgets can be expanded concurrently, sharing available space. No
  modal/overlay/fullscreen mode.
- **Scrolling**: each widget's editor and result pane scroll internally when content exceeds the
  widget's current height; the page scrolls vertically for widgets below the fold.
- **Widget lifecycle**: numbered by creation order, no renaming. A "+" control sits directly
  below the last widget; if the grid empties, that "+" becomes the grid's sole content. First
  launch (empty local storage) starts with exactly one empty widget.
- **Selection**: the "selected" widget is whichever has keyboard focus inside its editor.
  Ctrl+Enter acts on that widget — no separate selection state to track or render.
- **Injection queue**: a single global FIFO — only one call to `dcs-serve`'s `/api/exec` in
  flight at any time, across all widgets. Triggering an injection while another is in flight
  queues it; a queued widget's state is visually distinct from "running".
- **Timeout**: a fixed timeout consistent with the 30s default already used by
  `tools/integration-runner/run_scenarios.py` in the CTLD repo. On timeout, the widget's result
  shows a timeout status, its queue slot is released, and the queue advances automatically.
- **Cancellation**: a widget's stop button removes it from the queue if not yet started, or
  aborts its in-flight call if running; either way the queue advances immediately.
- **Result rendering**: a one-line status (idle / success / error / timeout, + elapsed time once
  known) plus the raw string body `dcs-serve` returned (or the raw error on an HTTP-level
  failure). No JSON pretty-printing, no scenario return-contract parsing (`PASS`/`FAIL`,
  `_SCN_<ID>_RESULT` polling) — this tool is a generic debugger, not scenario-aware.
- **Session persistence**: browser `localStorage` holds the open widgets and their current
  script content, restored on page load. Not synced through the backend.
- **Templates**: shared dropdown identical across all open widgets, sourced from the backend's
  local store. "Memorize" prompts for a name, then persists the (name, script) pair via the
  backend. A delete icon per dropdown entry removes it via the backend.
- **Branding**: one or more generic/abstract header images (aircraft silhouette + bridge/
  connector motif) — no official DCS World or Eagle Dynamics trademarked assets.

## Testing Decisions

- **Backend (FastAPI)** is the primary tested seam: endpoints for proxying an injection,
  managing the queue, CRUD on templates, and the connection/`api_key` state — tested over HTTP
  without a real `dcs-serve` (the outbound call mocked/stubbed), mirroring the backend test
  approach already used on `CTLD-TOOLS-WEBAPP`.
- **Frontend (Svelte)** components tested in isolation for: widget state-machine transitions
  (idle/queued/running/timeout/error), `localStorage` persistence round-trip, and the shared
  template dropdown staying in sync across widgets — without a real backend or `dcs-serve`.
- **No automated end-to-end test** against a live `dcs-serve`/DCS mission — needs a running
  mission, out of reach for CI; verified manually before each release, the same practice as
  CTLD's `ia`-tier scenarios.
- A good test asserts observable behavior (HTTP responses, rendered widget state, persisted
  store contents), never internal implementation (e.g. assert which widget shows as
  running/queued and in what order they resolve — not the shape of an internal queue array).

## Out of Scope

- Direct browser → `dcs-serve` calls (ADR 0001).
- Free-form draggable/resizable widget windows — only the responsive in-place grid.
- Auto-detecting `dcs-serve.yaml`'s location on disk.
- A full settings screen for host/port/`api_key` beyond the reconnection banner.
- Parallel (non-queued) injections.
- Widget renaming.
- Any awareness of CTLD's scenario return contract (`PASS`/`FAIL`, `_SCN_<ID>_RESULT` polling,
  `@tier` headers) — that's `tools/integration-runner/run_scenarios.py` in the CTLD repo, a
  different tool with a different job.
- Multi-user / remote hosting / auth / database — single local user, same model as
  `CTLD-TOOLS-WEBAPP`.
- Official DCS World / Eagle Dynamics branding assets.

## Further Notes

- This is the repo's first lot — it establishes the MVP end to end (connection, widgets, queue,
  templates, packaging) rather than slicing off a partial vertical.
- The repo has no GitHub remote yet; this PRD and its tickets live under `.backlog/` locally,
  per the convention used in the sibling CTLD repo, to be pushed once a remote exists.
- `CONTEXT.md` and ADRs 0001–0003 (written during the grill-with-docs session that produced this
  PRD) are the binding vocabulary/architecture record behind these decisions.
