"""FastAPI backend: proxies script injections to dcs-serve, holds connection settings.

The browser never talks to dcs-serve directly (ADR 0001) - this app holds the api_key and
relays every call, so the key never reaches client-side JS.
"""
from dataclasses import asdict
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from .dcs_client import exec_lua
from .store import Store

app = FastAPI(title="dcs-bridge-webui backend")
store = Store()


class InjectRequest(BaseModel):
    code: str
    timeout: float = 30.0


@app.post("/api/inject")
async def inject(req: InjectRequest) -> dict:
    conn = store.get_connection()
    result = await exec_lua(
        host=conn["host"],
        port=conn["port"],
        api_key=conn["api_key"],
        code=req.code,
        timeout=req.timeout,
    )
    return asdict(result)


class ConnectionSettings(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    api_key: Optional[str] = None


@app.get("/api/connection")
def get_connection() -> dict:
    return store.get_connection()


@app.put("/api/connection")
def set_connection(settings: ConnectionSettings) -> dict:
    fields = {k: v for k, v in settings.model_dump().items() if v is not None}
    return store.set_connection(**fields)
