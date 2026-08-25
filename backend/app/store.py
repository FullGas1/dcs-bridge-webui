"""Local, gitignored key-value store for connection settings (and, later, templates).

Never versioned: personal secrets (api_key) and personal debug scripts have no business in git.
"""
import json
from pathlib import Path
from threading import Lock
from typing import Any

DEFAULT_STORE_PATH = Path(__file__).resolve().parent.parent / "data" / "store.json"

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
