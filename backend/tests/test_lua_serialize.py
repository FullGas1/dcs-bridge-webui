"""Ticket 01 (FEAT-TABLE-RETURN-SERIALIZATION): the Lua table serializer.

Every test actually executes the generated Lua through a real `lua` interpreter (subprocess) and
lets the *Lua code itself* assert correctness via `assert(...)` - a non-zero exit means a real
Lua-level failure (syntax error, hang, or a failed assertion), not a Python string comparison
against the generated text. This is a deliberate choice (see PRD Testing Decisions): the subject
matter (cycles, truncation staying valid Lua, escaping, number formatting) is subtle enough that
pattern-matching the generated string would be a much weaker guarantee.

Requires a `lua` interpreter on PATH - a dev-only prerequisite this repo doesn't otherwise have.
"""
import shutil
import subprocess

import pytest

from app.lua_serialize import SERIALIZER_LUA

LUA_BIN = shutil.which("lua") or shutil.which("lua5.1")

pytestmark = pytest.mark.skipif(
    LUA_BIN is None, reason="requires a `lua` interpreter on PATH (dev-only test dependency)"
)


def run_lua(test_body: str, timeout: float = 5.0) -> None:
    """Runs SERIALIZER_LUA followed by test_body through a real Lua interpreter. test_body is
    expected to `assert(...)` its own success; a non-zero exit (syntax error, failed assert,
    runtime error) fails the pytest test with Lua's own stderr as the failure message."""
    script = SERIALIZER_LUA + "\n" + test_body
    proc = subprocess.run(
        [LUA_BIN, "-"], input=script, capture_output=True, text=True, timeout=timeout,
    )
    assert proc.returncode == 0, f"lua exited {proc.returncode}\nstderr:\n{proc.stderr}\nstdout:\n{proc.stdout}"


def test_flat_table_mixed_keys_roundtrips():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({val1 = 34, val2 = "toto"})
        local t = assert(loadstring("return " .. lit))()
        assert(t.val1 == 34)
        assert(t.val2 == "toto")
    """)


def test_pure_sequential_table_uses_positional_form():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({"a", "b", "c"})
        assert(not lit:find("%[1%]"), "sequential table should not use bracket notation: " .. lit)
        local t = assert(loadstring("return " .. lit))()
        assert(t[1] == "a" and t[2] == "b" and t[3] == "c")
    """)


def test_non_identifier_numeric_and_boolean_keys_use_bracket_form():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({["mon val"] = 34, [42] = "x", [true] = "y"})
        local t = assert(loadstring("return " .. lit))()
        assert(t["mon val"] == 34)
        assert(t[42] == "x")
        assert(t[true] == "y")
    """)


def test_reserved_word_key_forced_to_bracket_form():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({["end"] = 1, ["local"] = 2})
        assert(not lit:find("\\n    end = "), "a reserved word must not be emitted bareword: " .. lit)
        local t = assert(loadstring("return " .. lit))()
        assert(t["end"] == 1 and t["local"] == 2)
    """)


def test_table_with_a_hole_is_not_treated_as_sequential():
    run_lua("""
        local holey = {}
        holey[1] = "a"
        holey[3] = "c"
        local lit = __dcsBridgeWebuiSerialize(holey)
        local t = assert(loadstring("return " .. lit))()
        assert(t[1] == "a" and t[3] == "c" and t[2] == nil)
    """)


def test_nested_table_roundtrips_at_every_level():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({a = {b = {c = {d = 42}}}})
        local t = assert(loadstring("return " .. lit))()
        assert(t.a.b.c.d == 42)
    """)


def test_table_at_exactly_depth_ten_serializes_fully():
    run_lua("""
        local root = {}
        local cursor = root
        for i = 1, 9 do
            cursor.next = {}
            cursor = cursor.next
        end
        cursor.leaf = "bottom"
        local lit = __dcsBridgeWebuiSerialize(root)
        local t = assert(loadstring("return " .. lit))()
        local walk = t
        for i = 1, 9 do walk = walk.next end
        assert(walk.leaf == "bottom", "depth-10 table should serialize fully")
    """)


def test_table_past_depth_ten_is_truncated_not_infinite():
    run_lua("""
        local root = {}
        local cursor = root
        for i = 1, 11 do
            cursor.next = {}
            cursor = cursor.next
        end
        cursor.leaf = "bottom"
        local lit = __dcsBridgeWebuiSerialize(root)
        local t = assert(loadstring("return " .. lit))()
        local walk = t
        for i = 1, 9 do walk = walk.next end
        assert(type(walk.next) == "string" and walk.next:find("max depth"),
            "past the depth limit, the nested table should be replaced by a placeholder string")
    """)


def test_over_a_thousand_entries_truncates_but_stays_valid_lua():
    run_lua("""
        local big = {}
        for i = 1, 1200 do big["k" .. i] = i end
        local lit = __dcsBridgeWebuiSerialize(big)
        assert(lit:find("%-%- truncated"), "expected a truncation marker in: " .. lit:sub(-100))
        local t = assert(loadstring("return " .. lit))()
        local count = 0
        for _ in pairs(t) do count = count + 1 end
        assert(count <= 1000, "should not emit more than the 1000-entry budget, got " .. count)
    """)


def test_function_value_becomes_placeholder_and_stays_valid():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({fn = print, val = 1})
        local t = assert(loadstring("return " .. lit))()
        assert(t.fn == "<function>")
        assert(t.val == 1)
    """)


def test_direct_self_reference_becomes_placeholder_not_infinite_loop():
    run_lua("""
        local cyclic = {}
        cyclic.self = cyclic
        local lit = __dcsBridgeWebuiSerialize(cyclic)
        local t = assert(loadstring("return " .. lit))()
        assert(t.self == "<circular reference>")
    """)


def test_indirect_cycle_through_a_nested_table_is_also_caught():
    run_lua("""
        local a, b = {}, {}
        a.child = b
        b.parent = a
        local lit = __dcsBridgeWebuiSerialize(a)
        local t = assert(loadstring("return " .. lit))()
        assert(t.child.parent == "<circular reference>")
    """)


def test_string_with_quotes_backslashes_and_newlines_roundtrips():
    run_lua("""
        local original = 'line1\\nline2\\ttab"quote\\\\back'
        local lit = __dcsBridgeWebuiSerialize({s = original})
        local t = assert(loadstring("return " .. lit))()
        assert(t.s == original, "roundtrip mismatch: " .. tostring(t.s))
    """)


def test_integer_and_decimal_numbers_format_correctly():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({intval = 34, decimal = 3.5})
        assert(lit:find("intval = 34,") or lit:find("intval = 34\\n"),
            "an exact integer should not render with a trailing .0: " .. lit)
        local t = assert(loadstring("return " .. lit))()
        assert(t.intval == 34)
        assert(math.abs(t.decimal - 3.5) < 1e-9)
    """)


def test_empty_table_serializes_to_empty_braces():
    run_lua("""
        local lit = __dcsBridgeWebuiSerialize({})
        local t = assert(loadstring("return " .. lit))()
        local count = 0
        for _ in pairs(t) do count = count + 1 end
        assert(count == 0)
        assert(lit == "{}")
    """)
