# 01 — Make `build_exe.ps1` create its own venv

**Status:** done

## Parent

`.backlog/FEAT-CI-EXE-RELEASE/PRD.md`

## What to build

`backend\build_exe.ps1` currently hardcodes a path to a Python venv
(`backend\venv\Scripts\python.exe`) and assumes it already exists — nothing anywhere creates or
documents creating it. Update the script to create the venv itself if it's missing, before
installing dependencies (`requirements.txt` + `requirements-build.txt`) into it. This fixes a real
onboarding failure for anyone cloning this repo fresh and following the README's build-from-source
instructions, and makes the script directly reusable by CI with no separate venv-setup step of its
own.

## Acceptance criteria

- [x] Deleting an existing `backend\venv` and re-running `build_exe.ps1` recreates it and
      completes a successful build, verified manually.
- [x] Running the script again when `backend\venv` already exists behaves exactly as it does
      today (no unnecessary recreation, no behavior change for the existing dev workflow).
- [x] No change to the script's existing CLI usage (`powershell -ExecutionPolicy Bypass -File
      backend\build_exe.ps1`, no new required arguments).

## Blocked by

None - can start immediately
