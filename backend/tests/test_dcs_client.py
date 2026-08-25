import asyncio
import json

import httpx
import respx

from app.dcs_client import exec_lua


@respx.mock
def test_successful_exec_returns_result():
    respx.post("http://127.0.0.1:8080/api/exec").mock(
        return_value=httpx.Response(200, json={"result": "42"})
    )

    result = asyncio.run(exec_lua("127.0.0.1", 8080, "key123", "return 42"))

    assert result.ok is True
    assert result.result == "42"


@respx.mock
def test_dcs_error_surfaces_as_dcs_error():
    respx.post("http://127.0.0.1:8080/api/exec").mock(
        return_value=httpx.Response(200, json={"error": "attempt to call a nil value"})
    )

    result = asyncio.run(exec_lua("127.0.0.1", 8080, "key123", "bad()"))

    assert result.ok is False
    assert result.error_type == "dcs_error"
    assert "nil value" in result.message


@respx.mock
def test_http_error_surfaces_as_http_error_distinct_from_dcs_error():
    respx.post("http://127.0.0.1:8080/api/exec").mock(
        return_value=httpx.Response(504, text="Gateway Timeout")
    )

    result = asyncio.run(exec_lua("127.0.0.1", 8080, "key123", "return 1"))

    assert result.ok is False
    assert result.error_type == "http_error"
    assert result.status_code == 504


@respx.mock
def test_connection_refused_surfaces_as_connection_error():
    respx.post("http://127.0.0.1:8080/api/exec").mock(side_effect=httpx.ConnectError("refused"))

    result = asyncio.run(exec_lua("127.0.0.1", 8080, "key123", "return 1"))

    assert result.ok is False
    assert result.error_type == "connection_error"


@respx.mock
def test_timeout_surfaces_as_connection_error():
    respx.post("http://127.0.0.1:8080/api/exec").mock(side_effect=httpx.TimeoutException("timed out"))

    result = asyncio.run(exec_lua("127.0.0.1", 8080, "key123", "return 1", timeout=5))

    assert result.ok is False
    assert result.error_type == "connection_error"


@respx.mock
def test_request_carries_bearer_token_and_code_body_unchanged():
    weird_key = "zlbQmBpFsEomo1gDteifwu5bMxUz0tJyVkynpixwTI4"
    route = respx.post("http://127.0.0.1:8080/api/exec").mock(
        return_value=httpx.Response(200, json={"result": ""})
    )

    asyncio.run(exec_lua("127.0.0.1", 8080, weird_key, "return 1"))

    request = route.calls.last.request
    assert request.headers["authorization"] == f"Bearer {weird_key}"
    assert json.loads(request.content)["code"] == "return 1"
