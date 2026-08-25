"""Client for dcs-serve's REST API.

Request/response contract confirmed against tools/integration-runner/run_scenarios.py in the
sibling CTLD repo: POST /api/exec, body {"code": <lua>}, header
Authorization: Bearer <api_key>, JSON response {"result": <str>} or {"error": <str>}.
"""
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class ExecResult:
    ok: bool
    result: Optional[str] = None
    # "dcs_error" (dcs-serve ran the script and it errored) | "http_error" (non-2xx / bad body)
    # | "connection_error" (couldn't reach dcs-serve at all, including timeout)
    error_type: Optional[str] = None
    message: Optional[str] = None
    status_code: Optional[int] = None


async def exec_lua(
    host: str,
    port: int,
    api_key: str,
    code: str,
    timeout: float = 30.0,
    client: Optional[httpx.AsyncClient] = None,
) -> ExecResult:
    """Injects `code` into the live mission via dcs-serve. `client` is injectable for tests."""
    url = f"http://{host}:{port}/api/exec"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    body = {"code": code}

    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(timeout=timeout)
    try:
        resp = await client.post(url, json=body, headers=headers)
    except httpx.TimeoutException:
        return ExecResult(ok=False, error_type="connection_error", message="timed out waiting for dcs-serve")
    except httpx.RequestError as e:
        return ExecResult(ok=False, error_type="connection_error", message=str(e))
    finally:
        if owns_client:
            await client.aclose()

    if resp.status_code >= 400:
        return ExecResult(
            ok=False, error_type="http_error", status_code=resp.status_code, message=resp.text,
        )

    try:
        data = resp.json()
    except ValueError:
        return ExecResult(
            ok=False, error_type="http_error", status_code=resp.status_code,
            message="dcs-serve returned a non-JSON response",
        )

    if data.get("error"):
        return ExecResult(ok=False, error_type="dcs_error", message=str(data["error"]))

    return ExecResult(ok=True, result=data.get("result", ""))
