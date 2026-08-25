# dcs-bridge-webui

A local, turnkey web UI for live-debugging a running DCS mission through VEAF-dcs-bridge: paste
Lua snippets into on-page editors and inject them into the mission, one at a time.

## Language

**Widget**:
A self-contained unit in the page grid: a Lua script editor (CodeMirror) paired with the result
of its last injection. The primary unit of interaction — the user works with several at once.
_Avoid_: Panel, pane, editor (on its own — "editor" is just the CodeMirror part of a widget).

**Injection**:
Sending a widget's script to `dcs-serve`'s `/api/exec` for execution in the live DCS mission,
triggered by the widget's send button or Ctrl+Enter while it has keyboard focus.
_Avoid_: Execution, run (reserve "injection" for this specific action).

**Queue**:
The single global FIFO that injections wait in — only one injection runs against `dcs-serve` at
a time, across all widgets, to avoid two scripts racing each other inside the same DCS mission.
A queued or running widget shows a running indicator and a stop button that cancels its place in
the queue or its in-flight call.

**Template**:
A named script saved from a widget's editor via its "memorize" action, available to load into
any widget from a dropdown shared across the whole page. Deletable from the dropdown. Stored
locally (gitignored) by the backend — personal debug scripts, not shared/versioned.

**dcs-serve**:
The external VEAF-dcs-bridge process that holds the TCP link to the live DCS mission's injected
`dcs-bridge.lua` and exposes a REST API (`http_port`, default `8080`) that this project's backend
proxies. Not part of this codebase — installed and run independently by the user.

**api_key**:
The bearer token `dcs-serve` generates for itself on first launch (written to its own
`dcs-serve.yaml`, never printed to its console). Opaque to this project — no assumed format.
Entered once via the first-run connection banner, then persisted locally alongside templates.
