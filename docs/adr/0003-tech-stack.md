# Tech stack: FastAPI + Svelte/Vite/TS, packaged with PyInstaller

Reuses the stack already proven on `CTLD-TOOLS-WEBAPP` (in the CTLD repo) rather than picking
fresh: backend **FastAPI** (Python), frontend **Svelte + Vite + TypeScript**, packaged as a
single **PyInstaller** console-mode executable that boots the server and opens the browser on
double-click. The alternative — evaluating a different stack for this project — would mean
re-solving problems (PyInstaller packaging, CI frontend build, double-click launch detection)
that are already solved and working on a sibling project with the same distribution goal.
