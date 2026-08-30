# FEAT-CI-EXE-RELEASE — a always-fresh, directly downloadable exe

**Status:** delivered

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-self-sufficient-build-script` | done | 01 — Make `build_exe.ps1` create its own venv |
| `02-ci-build-and-release-workflow` | done | 02 — CI workflow: test, build, and publish the exe on every merge |
| `03-readme-download-instructions` | done | 03 — README: direct download link + build-from-source as a fallback |

## Problem Statement

Right now the only way to get `dcs-bridge-webui.exe` is to build it from source, following
`README.md`'s instructions — there is no downloadable, ready-to-run binary anywhere. Every merge
to `master` leaves the packaged exe (wherever a copy happens to exist) stale until someone
remembers to run `backend\build_exe.ps1` by hand. On top of that, following the README's own
build-from-source instructions on a fresh clone of this now-public repo actually fails: the
script assumes a Python venv already exists at `backend\venv\`, and nothing anywhere documents or
scripts creating one — a real onboarding bug for anyone other than the original developer.

## Solution

A GitHub Actions workflow runs on every push to `master` (i.e. every merged PR, since direct
commits to `master` are already disallowed): it installs dependencies, runs the full frontend and
backend test suites as a blocking gate, and — only if everything passes — builds the exe and
publishes it as the asset on a single rolling `latest` GitHub Release, replacing the previous
build. The download link never changes
(`https://github.com/FullGas1/dcs-bridge-webui/releases/latest/download/dcs-bridge-webui.exe`), so
a user always gets the newest working build with the same URL. Along the way,
`backend\build_exe.ps1` is made self-sufficient (creates its own venv if missing), fixing both the
CI's needs and the pre-existing onboarding bug for any human building from source. `README.md`'s
"Getting the app" section leads with the direct download link, keeping build-from-source as a
secondary option for contributors.

## User Stories

1. As a mission debugger who isn't a developer, I want a direct download link for the exe, so
   that I don't have to install Node/Python/PyInstaller just to try the tool.
2. As a returning user, I want that download link to always point at the latest working build, so
   that I don't have to hunt for a new link every time something changes.
3. As a mission debugger, I want the published exe to always come from a build where the tests
   passed, so that I never download a broken binary just because someone forgot to test locally
   before merging.
4. As a contributor cloning this repo for the first time, I want `build_exe.ps1` to work
   out-of-the-box, so that I'm not stuck on an undocumented missing-venv failure before I've even
   made a change.
5. As a maintainer, I want the CI to reuse the exact same build script a human would run locally
   (`build_exe.ps1`), so that there's one source of truth for "how the exe gets built," not a
   second, parallel build recipe living only in YAML.
6. As a maintainer, I want the release strategy to stay simple (one rolling release, no
   proliferating version tags) since this project has no semantic versioning or changelog today,
   so that adopting CI doesn't force in a versioning scheme nobody asked for.
7. As a user who wants to know what they downloaded, I want the release notes to show which
   commit/date the build came from, so that I can tell whether I have the version that fixes a
   given issue, without the filename itself ever changing.
8. As a maintainer, I want the CI workflow to only trigger on `master` pushes, so that in-progress
   PR branches don't each spend CI minutes building and publishing an exe nobody asked to download
   yet.

## Implementation Decisions

- **Trigger**: the workflow runs on `push` to `master` only. Every push to `master` is a merged
  PR (branch+PR is already a hard project rule — see `CLAUDE.md`), so this is equivalent to "on
  every merge."
- **Runner**: `windows-latest` — required, since PyInstaller produces a Windows `.exe` and the
  existing build script is PowerShell.
- **Quality gate, blocking**: before any build or publish step, the workflow runs the full
  existing test suites and stops the workflow (no build, no publish) if either fails:
  - Frontend: the existing Vitest suite and `svelte-check`/`tsc` type-check (the same commands
    already used by hand for every lot in this project).
  - Backend: the existing `pytest` suite in `backend/tests/` — not run in any CI today (there is
    no CI today), now becomes an automated gate for the first time.
- **`build_exe.ps1` becomes self-sufficient**: today it hardcodes a path to an already-created
  venv (`backend\venv\Scripts\python.exe`) and never creates one itself — undocumented anywhere,
  so a fresh clone's build-from-source path is currently broken for anyone but the original
  developer. The script is updated to create the venv itself when it doesn't already exist, before
  installing dependencies into it. This fixes the onboarding gap for humans and lets the CI
  workflow call the exact same script unmodified, with no separate venv-setup step of its own.
- **Release strategy: a single rolling release**, tagged `latest`. Each successful workflow run
  updates (or creates, on the very first run) the release tagged `latest`, replacing its exe
  asset. No per-merge release proliferation, no semantic version tags, no changelog — this project
  has none of that machinery today, and introducing it wasn't asked for; a rolling release matches
  the actual request ("always fresh, one link").
- **Asset naming: fixed and stable**, always `dcs-bridge-webui.exe`, so the download URL never
  changes: `.../releases/latest/download/dcs-bridge-webui.exe`. The commit SHA and/or date the
  build came from go in the release's own notes/body, not the filename — lets a user tell which
  build they have without the filename ever needing to change.
- **CI workflow shape** (new `.github/workflows/` file — no CI exists in this repo today):
  install Node + Python on the runner, install frontend deps and run its tests/type-check, install
  backend deps (into the now self-creating venv) and run pytest, then — only if all of the above
  passed — invoke `build_exe.ps1` unmodified to produce the exe, then publish/update the `latest`
  release with that file as its asset (replacing the previous one).
- **`README.md`'s "Getting the app" section is reordered**: the direct download link comes first,
  build-from-source instructions stay right after as the option for contributors, plus one short
  sentence noting the exe is automatically rebuilt and republished on every merge to `master` (so
  the link's freshness isn't left to the reader's imagination).

## Testing Decisions

- The CI workflow itself has no unit test in the conventional sense — it's YAML configuration.
  It's validated by actually observing it run on a real merge (this lot's own merge is the first
  real run) and confirming the `latest` release ends up created/updated with a downloadable exe
  asset.
- The `build_exe.ps1` self-sufficiency change is verified manually before committing: delete the
  local `backend\venv` and re-run the script, confirming it recreates the venv and builds
  successfully, matching this project's existing pattern of live-verifying build/tooling changes
  rather than writing an automated test for a build script.
- No application code (frontend or backend) changes in this lot — purely build/CI/doc tooling —
  so the existing frontend and backend test suites aren't expected to change behavior, only to
  start running automatically somewhere they didn't run before.

## Out of Scope

- Any real semantic versioning (git tags, a CHANGELOG, multiple historized releases) — explicitly
  passed over in favor of the single rolling release.
- Cross-platform builds (Linux/Mac) — the exe stays Windows-only, consistent with today.
- Code signing / notarization of the exe.
- Publishing anywhere other than a GitHub Release (e.g. a dedicated download page/site).

## Further Notes

- No ADR: an operational/CI decision, reversible — the "rolling release" choice was explicitly
  weighed against a versioned-releases alternative during grilling and judged non-structural for
  this project's current size.
- No new `CONTEXT.md` term — this lot only touches build/release tooling, not a DCS/webui domain
  concept.
- The `build_exe.ps1` fix (ticket 01) was originally scoped as "just make CI work," but grilling
  surfaced that it also fixes a pre-existing, real onboarding failure for any external contributor
  — folded into this lot rather than spun out separately, since it's the same one-line root cause
  (`build_exe.ps1` assuming a venv that nothing creates).
- **Post-merge finding**: the first real CI run created the `latest` release with `--prerelease`,
  which silently breaks GitHub's `/releases/latest` redirect — the exact mechanism the README's
  stable download link depends on (prereleases are excluded from "latest" by GitHub itself, so the
  link 404'd despite the release and asset existing). Caught immediately by verifying the actual
  API response rather than assuming success from a green workflow run; fixed in a same-day
  follow-up PR (both the workflow and the already-published release) and reverified via the
  GitHub API before considering this lot done.
