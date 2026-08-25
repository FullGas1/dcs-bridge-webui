"""Locates the built frontend (frontend/dist), if any, so the backend can serve it directly
when packaged as a single exe. In dev (frontend served by its own Vite dev server, nothing
built yet), this simply finds nothing and the caller skips mounting - API-only, as today.
"""
from pathlib import Path
from typing import Optional


def resolve_frontend_dist(meipass: Optional[str], repo_root: Path) -> Optional[Path]:
    """`meipass` is PyInstaller's extraction dir (`sys._MEIPASS`) when running as the packaged
    exe, `None` otherwise. `repo_root` is this project's root when not frozen."""
    if meipass is not None:
        candidate = Path(meipass) / "frontend_dist"
    else:
        candidate = repo_root / "frontend" / "dist"
    return candidate if candidate.is_dir() else None
