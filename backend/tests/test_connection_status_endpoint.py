from app import main as main_module
from app.dcs_client import ExecResult


def test_status_reports_connected_when_the_probe_succeeds(client, monkeypatch):
    async def fake_exec_lua(**kwargs):
        assert kwargs["code"] == "return 1"
        return ExecResult(ok=True, result="1")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    resp = client.get("/api/connection/status")

    assert resp.status_code == 200
    assert resp.json() == {"connected": True, "message": None}


def test_status_reports_disconnected_with_the_underlying_message_on_failure(client, monkeypatch):
    async def fake_exec_lua(**kwargs):
        return ExecResult(ok=False, error_type="connection_error", message="refused")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    resp = client.get("/api/connection/status")

    assert resp.json() == {"connected": False, "message": "refused"}


def test_status_uses_a_short_probe_timeout(client, monkeypatch):
    captured = {}

    async def fake_exec_lua(**kwargs):
        captured.update(kwargs)
        return ExecResult(ok=True, result="1")

    monkeypatch.setattr(main_module, "exec_lua", fake_exec_lua)

    client.get("/api/connection/status")

    assert captured["timeout"] == 5.0
