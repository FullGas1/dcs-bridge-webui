"""FastAPI backend: proxies script injections to dcs-serve, holds connection settings.

The browser never talks to dcs-serve directly (ADR 0001) - this app holds the api_key and
relays every call, so the key never reaches client-side JS.
"""
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .dcs_client import exec_lua
from .lua_serialize import correct_error_line_numbers, wrap_injection
from .static import resolve_frontend_dist
from .store import Store

app = FastAPI(title="dcs-bridge-webui backend")
store = Store()


@app.middleware("http")
async def no_cache(request, call_next):
    """A single-user local tool has no CDN/scale reason to let the browser cache anything
    across a rebuild - and heuristic caching (no explicit Cache-Control from StaticFiles)
    repeatedly served a stale bundle after a rebuild during development. Forces revalidation
    (still cheap: a 304 on an unchanged ETag) instead of silently serving old JS/CSS/HTML."""
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache"
    return response


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
        code=wrap_injection(req.code),
        timeout=req.timeout,
    )
    if not result.ok and result.error_type == "dcs_error" and result.message:
        # wrap_injection() always shifts a reported error line by +1 (ADR 0004) - undo that so
        # the user still sees the line number their own script actually has.
        result.message = correct_error_line_numbers(result.message)
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


@app.get("/api/connection/status")
async def connection_status() -> dict:
    """A trivial probe over the same /api/exec path a real injection takes, so the UI can tell
    connected from not without duplicating dcs_client's error classification."""
    conn = store.get_connection()
    result = await exec_lua(
        host=conn["host"], port=conn["port"], api_key=conn["api_key"], code="return 1", timeout=5.0,
    )
    return {"connected": result.ok, "message": None if result.ok else result.message}


class TemplateIn(BaseModel):
    name: str
    code: str


@app.get("/api/templates")
def list_templates() -> list[dict]:
    return store.get_templates()


@app.post("/api/templates")
def save_template(template: TemplateIn) -> list[dict]:
    name = template.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name must not be empty")
    return store.save_template(name, template.code)


@app.delete("/api/templates/{template_id}")
def delete_template(template_id: str) -> list[dict]:
    return store.delete_template(template_id)


# Serves the built frontend (ticket 08), if any - registered last so it never shadows an
# /api/* route above. In dev, nothing is built yet, so this is a no-op: the frontend's own
# Vite dev server proxies /api/* to this backend instead (see frontend/vite.config.ts).
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_frontend_dist = resolve_frontend_dist(getattr(sys, "_MEIPASS", None), _REPO_ROOT)
if _frontend_dist is not None:
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
