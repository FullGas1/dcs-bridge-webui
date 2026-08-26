"""Ticket 02 (FEAT-TABLE-RETURN-SERIALIZATION): injection wrapping, bootstrap-once, and error
line-number correction.

Like test_lua_serialize.py, the Lua-executing tests here run wrap_injection()'s output through a
real interpreter - mimicking dcs-bridge.lua's own `loadstring(code); pcall(f)` (see
F:\\Saved Games\\DCS.openbeta\\Scripts\\dcs-bridge.lua, handleExec) rather than running it as a
top-level chunk, since that's what actually determines the `[string "..."]:N:` error format this
module's correct_error_line_numbers() depends on.
"""
import json
import shutil
import subprocess

import pytest

from app.lua_serialize import correct_error_line_numbers, wrap_injection

LUA_BIN = shutil.which("lua") or shutil.which("lua5.1")

pytestmark = pytest.mark.skipif(
    LUA_BIN is None, reason="requires a `lua` interpreter on PATH (dev-only test dependency)"
)


def _run_via_loadstring(wrapped_code: str, timeout: float = 5.0) -> subprocess.CompletedProcess:
    """Mirrors dcs-bridge.lua's handleExec exactly: loadstring(code) then pcall(f), printing
    OK:<result> or RUNTIME_ERR:<message> (or COMPILE_ERR:<message> if it doesn't even compile)."""
    driver = (
        "local f, compileErr = loadstring(" + json.dumps(wrapped_code) + ")\n"
        "if not f then print('COMPILE_ERR:' .. tostring(compileErr)) os.exit(0) end\n"
        "local ok, result = pcall(f)\n"
        "if ok then print('OK:' .. tostring(result)) "
        "else print('RUNTIME_ERR:' .. tostring(result)) end\n"
    )
    return subprocess.run(
        [LUA_BIN, "-"], input=driver, capture_output=True, text=True, timeout=timeout,
    )


def test_table_return_is_serialized_end_to_end():
    proc = _run_via_loadstring(wrap_injection('return {val1 = 34, val2 = "toto"}'))
    assert proc.returncode == 0
    assert proc.stdout.startswith("OK:")
    body = proc.stdout[len("OK:"):]
    assert "val1 = 34" in body
    assert 'val2 = "toto"' in body


@pytest.mark.parametrize("user_code,expected", [
    ('return "hello"', "OK:hello"),
    ("return 42", "OK:42"),
    ("return true", "OK:true"),
    ("local x = 1", "OK:nil"),
])
def test_non_table_returns_pass_through_unchanged(user_code, expected):
    proc = _run_via_loadstring(wrap_injection(user_code))
    assert proc.returncode == 0
    assert proc.stdout.strip() == expected


def test_error_line_number_matches_the_users_own_script_after_correction():
    user_script = "local a = 1\nlocal b = 2\nerror(\"boom\")"
    proc = _run_via_loadstring(wrap_injection(user_script))
    assert proc.returncode == 0
    assert proc.stdout.startswith("RUNTIME_ERR:")
    raw_message = proc.stdout[len("RUNTIME_ERR:"):].strip()

    corrected = correct_error_line_numbers(raw_message)

    assert ":3:" in corrected, f"expected the user's actual line 3, got: {corrected}"


def test_error_on_first_line_of_user_script_also_corrects():
    proc = _run_via_loadstring(wrap_injection('error("immediate")'))
    raw_message = proc.stdout[len("RUNTIME_ERR:"):].strip()

    corrected = correct_error_line_numbers(raw_message)

    assert ":1:" in corrected


def test_bootstrap_guard_is_idempotent_across_sequential_injections():
    """Two injections in the same (simulated) mission session share Lua state - the second
    call's bootstrap guard must see the serializer already defined and skip redefining it,
    without erroring."""
    w1 = wrap_injection("return {a = 1}")
    w2 = wrap_injection("return {b = 2}")
    driver = (
        f"local f1 = loadstring({json.dumps(w1)})\n"
        "local ok1, r1 = pcall(f1)\n"
        "local defined_after_first = _G.__dcsBridgeWebuiSerialize ~= nil\n"
        f"local f2 = loadstring({json.dumps(w2)})\n"
        "local ok2, r2 = pcall(f2)\n"
        "print(tostring(ok1), tostring(ok2), tostring(defined_after_first))\n"
        "print(r1)\nprint(r2)\n"
    )
    proc = subprocess.run([LUA_BIN, "-"], input=driver, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    first_line = proc.stdout.splitlines()[0]
    assert first_line == "true\ttrue\ttrue"
    assert "a = 1" in proc.stdout
    assert "b = 2" in proc.stdout


def test_preamble_is_exactly_one_physical_line():
    wrapped = wrap_injection("local x = 1\nlocal y = 2")
    lines = wrapped.split("\n")
    assert lines[1] == "local x = 1"
    assert lines[2] == "local y = 2"


def test_correct_error_line_numbers_leaves_unrelated_text_untouched():
    assert correct_error_line_numbers("connection refused") == "connection refused"


def test_correct_error_line_numbers_never_goes_below_one():
    assert correct_error_line_numbers('[string "x"]:1: err') == '[string "x"]:1: err'
