# 02 — CI workflow: test, build, and publish the exe on every merge

**Status:** done

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

- [x] A push to `master` triggers the workflow automatically; a push to any other branch does not.
- [x] A failing frontend test, type-check, or backend pytest run stops the workflow before any
      build or publish step runs.
- [x] On success, `https://github.com/FullGas1/dcs-bridge-webui/releases/latest/download/dcs-bridge-webui.exe`
      serves the freshly built exe.
- [x] The `latest` release's notes/body identify the commit (SHA and/or date) the build came from.
- [x] Re-running the workflow on a later merge replaces the previous asset rather than
      accumulating additional releases or assets.

## Post-merge finding

The first real run created the `latest` release with `--prerelease`, which silently breaks
GitHub's `/releases/latest` redirect (prereleases are excluded from "latest" by GitHub itself) -
the download link didn't actually resolve. Fixed immediately (both the workflow's
`gh release create` call and the already-published release) - see the follow-up PR
[#8](https://github.com/FullGas1/dcs-bridge-webui/pull/8). Confirmed via the GitHub API on the
very next run that `/releases/latest` now correctly returns this release.

## Blocked by

- `01-self-sufficient-build-script` (this workflow calls `build_exe.ps1` as-is and depends on it
  being able to set up its own venv on a clean runner)
