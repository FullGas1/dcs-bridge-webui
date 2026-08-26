# FEAT-TABLE-RETURN-SERIALIZATION — literal Lua serialization of table injection results

**Status:** delivered — both tickets done, all tests green (69/69, including live-Lua-executed
round-trip verification of the wrapping, bootstrap-once behavior, and error line-number
correction — see Further Notes).

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-lua-table-serializer` | done | 01 — Lua table serializer |
| `02-injection-wrapping-and-error-line-correction` | done | 02 — Injection wrapping, bootstrap-once, and error line-number correction |

## Problem Statement

When an injected script's return value is a Lua table, the widget's "returns" pane today shows
something like `table: 0x556f2a3c1230` — a memory reference, not the data itself. A mission
debugger who wants to inspect a table (mission config, a list of units, a nested structure) gets
nothing usable and has to fall back to writing a throwaway script that manually walks and prints
the table's fields one at a time.

## Solution

When an injection's return value is a table, the widget's "returns" pane instead shows the
table's full content, written out as a literal Lua table constructor expression — indented for
readability, and valid Lua on its own (pasteable into any Lua context to recreate the same
data, modulo values that have no literal form at all, like a live DCS engine object).

The rewrite happens on the DCS side, inside the mission, before the result ever reaches this
project: `dcs-bridge.lua` — the external bridge every user installs into their own DCS `Saved
Games` folder (`github.com/VEAF/dcs-bridge`, outside this project's control or distribution) —
stringifies every exec result with `tostring()` before dcs-serve's JSON response is built.
Verified live: `return {val1 = 34}` comes back today as `{"result": "table: 0x..."}` — the
table's structure is destroyed before it ever reaches this backend, so no amount of
backend/frontend parsing after the fact can recover it. See ADR 0004.

## User Stories

1. As a mission debugger, I want a table return value shown as its actual content instead of a
   memory reference, so that I can inspect mission state without writing a throwaway
   field-by-field dump script.
2. As a mission debugger, I want the displayed table to be valid Lua I can paste elsewhere (e.g.
   into another widget, or a mission script) to recreate the same data, so that I can reuse a
   captured snapshot instead of re-deriving it.
3. As a mission debugger, I want a nested table (a table inside a table) to serialize correctly
   at any depth up to a sane limit, so that realistic mission data (which is rarely flat)
   displays usefully.
4. As a mission debugger, I want a sequential list-like table (e.g. a list of unit names) shown
   in compact positional form (`{"a", "b", "c"}`) rather than verbose bracket notation, so that
   the common case stays readable.
5. As a mission debugger, I want a table whose keys aren't plain identifiers (numbers,
   booleans, strings with spaces or punctuation) still serialized correctly, so that no
   real-world table shape breaks the display.
6. As a mission debugger, I want a table containing a value that has no literal Lua
   representation (a function, a live DCS engine object, a coroutine) to still display as valid,
   re-injectable Lua, so that one awkward field doesn't wreck the whole table's readability, even
   though I understand that specific field can't be recreated as data.
7. As a mission debugger, I want a self-referencing (circular) table to display safely instead
   of freezing the mission or crashing the exec, so that an unusual table shape is a display
   quirk, not an outage.
8. As a mission debugger, I want an extremely large or deeply nested table to be capped rather
   than flooding the returns pane (or the mission's Lua thread) with an unbounded dump, so that
   one careless `return` doesn't degrade the whole live-debug session.
9. As a mission debugger, I want a non-table return value (string, number, boolean, nothing) to
   keep behaving exactly as it does today, so that this feature never changes behavior I already
   rely on.
10. As a mission debugger, I want an error message's reported line number to still match my own
    script's line numbering, so that the extra machinery behind the scenes never makes debugging
    my own code harder than it already is.
11. As a mission debugger, I want this to work without editing or upgrading my own installed
    `dcs-bridge.lua`, so that a stale/unpatched bridge on my machine doesn't block the feature.
12. As a contributor, I want the table-serialization logic covered by tests that actually run the
    generated Lua through a real interpreter, so that a subtle escaping/formatting bug can't slip
    through as a passing test that merely pattern-matched a string.

## Implementation Decisions

- **New backend module**, alongside the existing `dcs_client.py`/`store.py`, owning three
  responsibilities: (a) a Lua source constant for the bootstrap-and-serialize preamble, (b) a
  function that takes the widget's original code and produces the final Lua text to send to
  `dcs-serve`, (c) a function that corrects a line number found in a returned error message.
  Used only by the `/api/inject` endpoint — `exec_lua()` itself (the generic dcs-serve HTTP
  client) is untouched, since it's also called by the trivial `/api/connection/status` ping and
  must never be wrapped.
- **Wrapping shape**: the user's original script is embedded verbatim inside an immediately-
  invoked anonymous function, whose result is type-checked; a table gets passed through the
  serializer, anything else passes through unchanged (identical to today's behavior). Everything
  preceding the user's code — including the serializer bootstrap — is constrained to a single
  physical source line, so the line-number shift this introduces is always exactly +1,
  regardless of whether the bootstrap actually runs on a given call.
- **Bootstrap-once serializer**: the serializer is defined as a global function
  (`_G.__dcsBridgeWebuiSerialize`) guarded by an `if not already-defined` check. A DCS mission's
  Lua state persists across injections (confirmed in `dcs-bridge.lua`: each call recompiles the
  submitted code via `loadstring` but runs it in the same shared global environment), so only the
  first injection of a session pays the cost of defining it.
  ```lua
  local __r=(function()
  <user's original code, verbatim>
  end)();if type(__r)=="table" then return __dcsBridgeWebuiSerialize(__r) else return __r end
  ```
- **Output shape**: a bare Lua table constructor expression, not a named assignment — directly
  pasteable as a value anywhere (`local x = <pasted>`, `return <pasted>`, an argument, etc.).
  Pretty-printed with indentation for human readability; indentation has no bearing on whether
  the text is valid, re-executable Lua.
- **Key formatting**, in priority order: a purely sequential integer-keyed table (1..n, no gaps)
  renders as a positional list (`{"a", "b", "c"}`); a string key that is a valid Lua identifier
  renders as bareword (`val1 = 34`); every other key (non-identifier strings, non-sequential
  numbers, booleans, table-as-key) renders in explicit bracket form (`["my val"] = 34`,
  `[42] = "x"`, `[true] = "y"`).
  ```lua
  ["mon val"] = 34
  ```
- **Non-literalizable value types** (`function`, `userdata` — expected to be common here, e.g. a
  DCS `Unit`/`Group` object embedded in a returned table — and `thread`) render as a descriptive
  placeholder string (`"<function>"`, `"<userdata>"`, `"<thread>"`), keeping the table
  syntactically valid and re-injectable even though that one field's original value can't be
  recreated.
- **Cycle handling**: the walk tracks tables already visited along the current recursion path; a
  reference back to one of them renders as `"<circular reference>"` instead of recursing forever
  — an unbounded cycle would otherwise hang the mission's single Lua thread, not just the exec
  call.
- **String escaping**: a hand-written escaper (not Lua's native `%q`), producing compact,
  textual `\n`/`\t`/etc. escapes rather than `%q`'s tendency to emit a literal embedded newline
  for a `\n` character in Lua 5.1. Must always remain a valid, re-executable Lua string literal
  (quotes, backslashes, control characters correctly escaped).
- **Number formatting**: `%.14g` — renders an exact integer as `34` rather than `34.0` (Lua 5.1
  has a single internal numeric type), while avoiding floating-point precision artifacts on a
  genuine non-integer value.
- **Size limits**, to bound worst-case payload/mission-thread cost: max recursion depth **10**;
  max **1000 total entries across the whole serialized structure** (a single global counter
  shared across all nested tables, not a per-table budget — a per-table cap could still let a
  deep structure produce an unbounded total). No cap on total character length. Hitting either
  limit truncates and appends a Lua comment marker (e.g. `-- truncated: N more entries`) rather
  than emitting invalid Lua.
- **Non-table return values**: entirely unaffected — the wrapper's type check passes anything
  that isn't a table straight through, matching today's behavior exactly (string, number,
  boolean, nil/no return).
- **Error line-number correction**: since the preamble is constrained to exactly one physical
  line (see Wrapping shape above), and `dcs-bridge.lua` reports a failing exec's error as
  `[string "..."]:N: message` (confirmed live), the backend subtracts 1 from any line number
  found in a returned error message before it reaches the frontend — so a script that errors
  still reports the line number the user actually wrote, not the wrapped one.
- **No frontend changes**: `Widget.svelte`'s existing `<pre class="result-body">` (with
  `white-space: pre-wrap`) already renders a multi-line, indented string as-is — no code change
  needed there to display the new output correctly.

## Testing Decisions

- The serializer's correctness is subtle enough (cycles, truncation staying valid Lua, escaping,
  number formatting) that string-pattern-matching alone would be a weak guarantee. Tests instead
  construct a reference case, generate the expected Lua text, and **actually execute it through a
  local `lua` interpreter** (available on the dev machine) via a subprocess call, asserting the
  execution succeeds and the round-tripped values match the original case — not just that the
  generated string looks plausible.
- This introduces a new dev-only dependency (a `lua` interpreter on `PATH`) that the existing
  suite doesn't have (`backend/tests/test_dcs_client.py` mocks HTTP via `respx` and has no
  language-execution dependency) — to be documented as a prerequisite; this repo has no CI today,
  so this only affects local test runs.
- The wrapping/line-correction logic at the `/api/inject` boundary is tested the way
  `test_inject_endpoint.py` already tests that endpoint — through the FastAPI `TestClient`,
  mocking the outbound `dcs-serve` call.

## Out of Scope

- Fixing `dcs-bridge.lua` itself — it's an externally-maintained project the user has already
  reported the `tostring(result ~= nil and result or "")` false/nil-conflation bug to separately;
  not part of this lot regardless of whether/when it's fixed upstream.
- A `showTable("name")`-style helper that looks up a global by name — considered during grilling
  and dropped: `return myTable` already gets serialized automatically by the wrapper, so a
  separate lookup function adds nothing.
- Any default/pre-seeded script templates — a `showTable` default template was the original
  reason to consider this, and it's no longer needed once `showTable` itself was dropped.
- Any frontend change — the existing result display already renders the new output correctly.

## Further Notes

- ADR 0004 (`docs/adr/0004-inject-side-table-serialization.md`) records why the rewrite happens
  client-side (in this project's backend, rewriting the injected code) rather than by patching
  the external bridge — the load-bearing, easy-to-second-guess decision behind this whole lot.
- Verified live against a running mission during grilling (not just read from `dcs-bridge.lua`'s
  source): a table return already comes back as `table: 0x...` today, and wrapping a script in an
  extra preceding line already shifts `dcs-bridge.lua`'s reported error line by exactly +1.
- Delivery verification: beyond the 69 passing pytest tests (15 for the serializer, the rest for
  wrapping/correction/wiring), the wrapping and error-correction path was independently checked
  by mimicking `dcs-bridge.lua`'s exact `loadstring(code); pcall(f)` sequence in a real `lua`
  subprocess (not the `lua -` top-level-chunk shape, which reports errors differently) — this is
  what proved the +1 shift and its correction actually hold under the real chunk-naming Lua uses
  for a `loadstring`-compiled string, not just under a simplified test harness.
