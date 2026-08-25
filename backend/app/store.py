"""Local, gitignored key-value store for connection settings and script templates.

Never versioned: personal secrets (api_key) and personal debug scripts have no business in git.
"""
import json
import sys
import uuid
from pathlib import Path
from threading import Lock
from typing import Any


def resolve_store_path(frozen: bool, executable: Path, source_file: Path) -> Path:
    """Packaged as a --onefile exe, `source_file` resolves inside PyInstaller's ephemeral
    per-run extraction dir - writing there would silently lose every setting and template the
    moment the exe exits. The store must instead live next to the exe itself, so it survives
    between runs (and is easy for a user to find/back up)."""
    base = executable.resolve().parent if frozen else source_file.resolve().parent.parent
    return base / "data" / "store.json"


DEFAULT_STORE_PATH = resolve_store_path(
    getattr(sys, "frozen", False), Path(sys.executable), Path(__file__),
)

CONNECTION_DEFAULTS = {
    "host": "127.0.0.1",
    "port": 8080,
    "api_key": "",
}


class Store:
    """Reads/writes a single local JSON file. One process, no concurrent writers assumed
    beyond this app's own request handlers, hence the plain in-process lock."""

    def __init__(self, path: Path = DEFAULT_STORE_PATH):
        self.path = path
        self._lock = Lock()

    def _read(self) -> dict[str, Any]:
        if not self.path.exists():
            return {}
        with self.path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def _write(self, data: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_connection(self) -> dict[str, Any]:
        data = self._read()
        return {**CONNECTION_DEFAULTS, **data.get("connection", {})}

    def set_connection(self, **fields: Any) -> dict[str, Any]:
        with self._lock:
            data = self._read()
            conn = {**CONNECTION_DEFAULTS, **data.get("connection", {}), **fields}
            data["connection"] = conn
            self._write(data)
            return conn

    def get_templates(self) -> list[dict[str, Any]]:
        return self._read().get("templates", [])

    def save_template(self, name: str, code: str) -> list[dict[str, Any]]:
        """Creates a template, or overwrites the existing one with the same name (ticket 05:
        at most one template per name - no silent duplicates)."""
        with self._lock:
            data = self._read()
            templates = [t for t in data.get("templates", []) if t["name"] != name]
            templates.append({"id": uuid.uuid4().hex, "name": name, "code": code})
            data["templates"] = templates
            self._write(data)
            return templates

    def delete_template(self, template_id: str) -> list[dict[str, Any]]:
        with self._lock:
            data = self._read()
            templates = [t for t in data.get("templates", []) if t["id"] != template_id]
            data["templates"] = templates
            self._write(data)
            return templates
