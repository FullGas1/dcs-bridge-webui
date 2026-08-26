# Serialize table returns by rewriting the injected code, not by parsing the response

`dcs-bridge.lua` — the external bridge script (`github.com/VEAF/dcs-bridge`) each user installs
into their own DCS `Saved Games` folder, outside this project's control or distribution —
stringifies every exec result with `tostring(result)` before it ever reaches `dcs-serve`'s JSON
response (verified live: `return {val1 = 34}` comes back as `{"result": "table: 0x..."}`). A
table's structure is destroyed before this webui's backend ever sees it; no amount of
backend/frontend parsing can recover it after the fact.

Fixing `dcs-bridge.lua` upstream doesn't help either: it's a separately-installed dependency, and
this project can't force existing installs to update. So the backend instead rewrites the
injected code itself — wrapping the user's script so that, if its own return value is a table,
the DCS-side Lua serializes it into a literal Lua source string *before* `dcs-bridge.lua`'s
`tostring()` ever runs on it. The serialization happens inside the mission, not in this project's
Python/JS.

Consequence: the backend must track (and correct for) the one line of preamble this adds ahead
of the user's code, so error line numbers shown to the user still match their own script.
