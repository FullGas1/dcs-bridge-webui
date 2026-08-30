# 02 — CI workflow: test, build, and publish the exe on every merge

**Status:** ready

## Parent

`.backlog/FEAT-CI-EXE-RELEASE/PRD.md`

## What to build

A new GitHub Actions workflow, triggered on every push to `master` (i.e. every merged PR),
running on `windows-latest`:

1. Install Node and Python on the runner.
2. Install frontend dependencies and run its test suite (Vitest) and type-check
   (`svelte-check`/`tsc`).
3. Install backend dependencies (into the now self-creating venv from ticket 01) and run the
   existing `pytest` suite.
4. If, and only if, both of the above pass: invoke `build_exe.ps1` unmodified to produce
   `backend\dist\dcs-bridge-webui.exe`.
5. Publish/update a single rolling GitHub Release tagged `latest` with this file as its asset,
   replacing whatever was there before (fixed filename, always `dcs-bridge-webui.exe`, so the
   download URL never changes). The release's own notes/body include the commit SHA and/or date
   the build came from.

If either test step fails, the workflow stops — no build, no publish.

## Acceptance criteria

- [ ] A push to `master` triggers the workflow automatically; a push to any other branch does not.
- [ ] A failing frontend test, type-check, or backend pytest run stops the workflow before any
      build or publish step runs.
- [ ] On success, `https://github.com/FullGas1/dcs-bridge-webui/releases/latest/download/dcs-bridge-webui.exe`
      serves the freshly built exe.
- [ ] The `latest` release's notes/body identify the commit (SHA and/or date) the build came from.
- [ ] Re-running the workflow on a later merge replaces the previous asset rather than
      accumulating additional releases or assets.

## Blocked by

- `01-self-sufficient-build-script` (this workflow calls `build_exe.ps1` as-is and depends on it
  being able to set up its own venv on a clean runner)
