# 02 — Injection wrapping, bootstrap-once, and error line-number correction

**Status:** ready

## What to build

Wire ticket 01's serializer into the actual `/api/inject` request path, so a widget's table
return is transparently serialized end to end, without changing anything about how a non-table
return already behaves.

- A function that takes the widget's original code and produces the final Lua text to send to
  `dcs-serve`: the user's code embedded verbatim inside an immediately-invoked anonymous
  function, whose result is type-checked — a table gets passed to the serializer from ticket 01,
  anything else (string, number, boolean, nil/no return) passes through completely unchanged.
- The serializer from ticket 01 is bootstrapped once as a global function, guarded so a mission
  that already has it defined (from an earlier injection in the same session) skips redefining
  it. Everything preceding the user's own code — the bootstrap guard included — is constrained
  to a single physical source line, so wrapping always shifts line numbers by exactly +1,
  whether or not the bootstrap actually runs on a given call.
- A function that corrects a line number found in a returned error message: `dcs-bridge.lua`
  reports a failing exec as `[string "..."]:N: message`; since wrapping always adds exactly one
  line ahead of the user's code, this subtracts 1 from `N` so the error the user sees still
  points at their own script's line, not the wrapped one.
- Both are called only from the `/api/inject` endpoint. `exec_lua()` itself, and the
  `/api/connection/status` ping that reuses it (`"return 1"`), stay completely untouched — never
  wrapped.

## Acceptance criteria

- [ ] Injecting a script that returns a table results in the widget's returns pane showing the
      serialized Lua text (end-to-end, through `/api/inject`), not a `table: 0x...` reference.
- [ ] Injecting a script that returns a string, a number, a boolean, or nothing behaves exactly
      as it does today — response content unchanged by this change.
- [ ] Two successive injections in the same session both return correctly-serialized tables; the
      bootstrap guard means the serializer definition is only sent/compiled once (verifiable via
      the constructed request payload for the second call).
- [ ] A script that errors reports the same line number it would have reported before this
      change (i.e., the +1 shift introduced by wrapping is corrected back out), verified for an
      error on the first line of the user's script and on a later line.
- [ ] `/api/connection/status` still sends its trivial `"return 1"` unwrapped, unchanged from
      today.

## Blocked by

- Ticket 01 (Lua table serializer) — the wrapper's bootstrap preamble embeds ticket 01's
  serializer source.
