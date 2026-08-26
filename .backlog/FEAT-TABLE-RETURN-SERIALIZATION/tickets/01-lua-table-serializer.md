# 01 — Lua table serializer

**Status:** ready

## What to build

A Lua function that takes any Lua table and returns a string of literal Lua source — an
indented table constructor expression that, evaluated on its own, reproduces the same data
(modulo values with no literal Lua form at all).

Covers, per the PRD's Implementation Decisions:
- Recursion up to depth 10; a table at depth 11 renders as a truncation marker instead of
  recursing further.
- A single counter of total emitted entries shared across the *whole* structure (not reset per
  nested table) capped at 1000; hitting it truncates the rest of whatever table is being emitted
  at that point and appends a Lua comment marker (e.g. `-- truncated: N more entries`) — the
  overall output stays syntactically valid Lua even when truncated.
- Key formatting, in priority order: a table that is a pure sequence (integer keys 1..n, no
  gaps, nothing else) renders as a positional list (`{"a", "b", "c"}`); a string key that is a
  valid Lua identifier renders bareword (`val1 = 34`); every other key renders in bracket form
  (`["my val"] = 34`, `[42] = "x"`, `[true] = "y"`).
- Non-literalizable value types (`function`, `userdata`, `thread`) render as a descriptive
  placeholder string (`"<function>"`, `"<userdata>"`, `"<thread>"`).
- A table already present earlier on the current recursion path (a direct or indirect
  self-reference) renders as `"<circular reference>"` instead of recursing — must not loop
  indefinitely or overflow the call stack on any cyclic input.
- String values (and bracket-form string keys) go through a hand-written escaper — not Lua's
  native `%q` — producing compact, textual escapes (`\n`, `\t`, `\"`, `\\`, etc.), always
  producing a valid re-executable Lua string literal.
- Numbers formatted with `%.14g` (renders an exact integer as `34`, not `34.0`; avoids
  floating-point precision artifacts on a real non-integer value).
- Output is indented/pretty-printed, not compact on one line.

This ticket is pure Lua logic with no dependency on the DCS environment, `dcs-serve`, or this
project's HTTP layer — it takes a table, returns a string.

## Acceptance criteria

- [ ] A flat table with mixed identifier-style string keys and numbers serializes to valid,
      correctly-indented Lua that a real Lua interpreter accepts and that reproduces the
      original key/value pairs when loaded back.
- [ ] A purely sequential table renders in compact positional form, not bracket form.
- [ ] A table with a non-identifier string key, a numeric key, and a boolean key each render in
      explicit bracket form with the key itself correctly literalized.
- [ ] A table nested several levels deep serializes correctly at every level; a table nested
      exactly at the depth-10 boundary and one past it are both covered, with the one past the
      boundary producing a truncation marker instead of recursing further.
- [ ] A table containing 1000+ total entries across nested levels truncates once the shared
      global counter is exhausted, appends a truncation marker, and the output up to that point
      is still valid, loadable Lua.
- [ ] A table containing a function value, and separately one containing a `<circular
      reference>` back to itself (direct self-reference, and one indirect via an intermediate
      nested table), both serialize to valid Lua without hanging or erroring, with the
      respective placeholder string in place of the unrepresentable value.
- [ ] A string value containing a quote, a backslash, and a newline serializes to a Lua string
      literal that a real Lua interpreter loads back to the exact original string.
- [ ] An integer-valued number and a non-integer number each serialize to the expected `%.14g`
      form (e.g. `34`, not `34.0`; a real decimal without spurious precision digits).
- [ ] Every test in this ticket asserts by actually executing the produced Lua text through a
      local `lua` interpreter (subprocess) and checking the round-tripped result — not by
      pattern-matching the generated string.

## Blocked by

None - can start immediately
