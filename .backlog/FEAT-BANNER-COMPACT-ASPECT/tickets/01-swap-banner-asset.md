# 01 — Swap `banner.jpg` for the compact-aspect version

**Status:** done

## Parent

`.backlog/FEAT-BANNER-COMPACT-ASPECT/PRD.md`

## What to build

Replace the banner image asset with the new, wider-aspect recomposition the user supplied (same
content — helicopters scene, tactical-map/code scene, title, tagline, code-injection symbol — just
recomposed at a shorter native height so the banner takes up noticeably less vertical space on
screen). The new file is already in place at the same path the component references, so no
`.svelte`/`.css`/`.ts` change is needed — `BrandingHeader.svelte`'s existing `width:100%;
height:auto` CSS adapts automatically to the new aspect ratio.

Alt text stays exactly as-is (same semantic content, only recomposed).

## Acceptance criteria

- [x] The banner renders at the new, shorter aspect ratio in the running app (verified live, dev
      server) — noticeably less vertical space than before, with title, tagline, the WEBUI/
      INJECTEUR LUA module, both scenes, and the code-injection symbol all still fully legible.
- [x] No `.svelte`/`.css`/`.ts` file is modified — this ticket's diff is the binary asset only.
- [x] `BrandingHeader.test.ts` continues to pass unmodified (still asserts exactly one
      `<img src="/banner.jpg">`, zero `<svg>`, and no trademarked terms in the alt text).
- [x] Full frontend test suite and type-check both pass.

## Blocked by

None - can start immediately
