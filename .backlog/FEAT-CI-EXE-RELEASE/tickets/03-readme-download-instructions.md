# 03 — README: direct download link + build-from-source as fallback

**Status:** done

## Parent

`.backlog/FEAT-CI-EXE-RELEASE/PRD.md`

## What to build

Reorder `README.md`'s "Getting the app" section: lead with the direct download link
(`https://github.com/FullGas1/dcs-bridge-webui/releases/latest/download/dcs-bridge-webui.exe`),
keep the existing build-from-source instructions (`build_exe.ps1`) right after as the option for
contributors, and add one short sentence noting the exe is automatically rebuilt and republished
on every merge to `master`.

## Acceptance criteria

- [x] The direct download link appears first in "Getting the app," before the build-from-source
      instructions.
- [x] A short sentence explains the exe is rebuilt/republished automatically on every merge.
- [x] Build-from-source instructions are preserved, unchanged in substance, as the secondary path.
- [x] The download link actually resolves to a real asset (verified once ticket 02's workflow has
      run at least once on `master` - confirmed via the GitHub API after the prerelease fix,
      see ticket 02's post-merge finding).

## Blocked by

- `02-ci-build-and-release-workflow` (the link this ticket documents only resolves to a real file
  once that workflow has published at least one release)
