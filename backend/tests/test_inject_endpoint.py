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
    assert captured["code"] == "return 'hello'"


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
