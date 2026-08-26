from app import main as main_module
from app.dcs_client import ExecResult


def test_inject_forwards_code_and_returns_raw_result(client, monkeypatch):
    captured = {}

    async def fake_exec_lua(**kwargs):
        captured.update(kwargs)
        return ExecResult(ok=True, result="hello")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    resp = client.post("/api/inject", json={"code": "return 'hello'"})

    assert resp.status_code == 200
    assert resp.json() == {
        "ok": True, "result": "hello", "error_type": None, "message": None, "status_code": None,
    }
    # ticket 02: the code sent to dcs-serve is wrapped (ADR 0004), not the widget's code verbatim -
    # but the widget's own code must still appear, embedded, in what actually gets sent.
    assert "return 'hello'" in captured["code"]
    assert captured["code"] != "return 'hello'"


def test_inject_wraps_code_starting_at_line_two(client, monkeypatch):
    """wrap_injection's preamble must stay a single physical line (ADR 0004) - everything ahead
    of the widget's own code collapses onto line 1, so the widget's code always starts at line 2."""
    captured = {}

    async def fake_exec_lua(**kwargs):
        captured.update(kwargs)
        return ExecResult(ok=True, result="")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    client.post("/api/inject", json={"code": "local x = 1"})

    lines = captured["code"].split("\n")
    assert lines[1] == "local x = 1"


def test_inject_corrects_error_line_number(client, monkeypatch):
    async def fake_exec_lua(**kwargs):
        return ExecResult(
            ok=False, error_type="dcs_error",
            message='[string "..."]:4: boom',
        )

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    resp = client.post("/api/inject", json={"code": "error('boom')"})

    assert resp.json()["message"] == '[string "..."]:3: boom'


def test_inject_leaves_non_dcs_error_messages_untouched(client, monkeypatch):
    async def fake_exec_lua(**kwargs):
        return ExecResult(ok=False, error_type="connection_error", message="[string \"...\"]:4: refused")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    resp = client.post("/api/inject", json={"code": "return 1"})

    # only a dcs_error (the mission's own Lua actually ran and failed) gets line-corrected -
    # a connection failure was never wrapped code in the first place.
    assert resp.json()["message"] == "[string \"...\"]:4: refused"


def test_connection_status_ping_is_never_wrapped(client, monkeypatch):
    captured = {}

    async def fake_exec_lua(**kwargs):
        captured.update(kwargs)
        return ExecResult(ok=True, result="1")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    client.get("/api/connection/status")

    assert captured["code"] == "return 1"


def test_inject_uses_30s_default_timeout(client, monkeypatch):
    captured = {}

    async def fake_exec_lua(**kwargs):
        captured.update(kwargs)
        return ExecResult(ok=True, result="")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    client.post("/api/inject", json={"code": "return 1"})

    assert captured["timeout"] == 30.0


def test_inject_surfaces_connection_failure_distinguishably(client, monkeypatch):
    async def fake_exec_lua(**kwargs):
        return ExecResult(ok=False, error_type="connection_error", message="refused")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    resp = client.post("/api/inject", json={"code": "return 1"})

    body = resp.json()
    assert body["ok"] is False
    assert body["error_type"] == "connection_error"


def test_inject_with_empty_store_uses_default_host_and_port(client, monkeypatch):
    captured = {}

    async def fake_exec_lua(**kwargs):
        captured.update(kwargs)
        return ExecResult(ok=True, result="")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    client.post("/api/inject", json={"code": "return 1"})

    assert captured["host"] == "127.0.0.1"
    assert captured["port"] == 8080


def test_connection_settings_round_trip(client):
    put_resp = client.put("/api/connection", json={"api_key": "s3cr3t"})
    assert put_resp.status_code == 200
    assert put_resp.json()["api_key"] == "s3cr3t"

    get_resp = client.get("/api/connection")
    assert get_resp.json()["api_key"] == "s3cr3t"
    assert get_resp.json()["host"] == "127.0.0.1"
