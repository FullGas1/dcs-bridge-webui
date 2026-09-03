# FEAT-BANNER-COMPACT-ASPECT — a shorter banner that doesn't crowd out the widgets

**Status:** delivered

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-swap-banner-asset` | done | 01 — Swap `banner.jpg` for the compact-aspect version |

## Problem Statement

The banner (`BrandingHeader.svelte`, delivered in `FEAT-BRANDING-HEADER-REDESIGN`) renders its
image at `width:100%; height:auto`, so its displayed height is dictated entirely by the image's
own native aspect ratio. The original asset was ~2.36:1 (1024×434px) — on a wide desktop viewport
this renders quite tall (e.g. ~815px at 1920px width), pushing widgets and their results
substantially below the fold. A mission debugger wants to see as much widget/result content as
possible without scrolling past a large banner every time.

## Solution

Replace `banner.jpg` with a new version of the same composition, recomposed by the user at a much
wider aspect ratio (~4.68:1, 1024×219px) — same helicopters scene, same tactical-map/code scene,
same title and tagline, same code-injection symbol crossing the junction, just recomposed shorter
rather than cropped. Because `BrandingHeader.svelte`'s CSS (`width:100%; height:auto`) already
scales to whatever aspect ratio the image has, no component or CSS change is needed — swapping the
binary asset in place is the entire implementation. Verified live: the banner now occupies ~20% of
visible viewport height instead of ~39%, with every essential element (title, tagline, WEBUI
module, both scenes, the injection symbol) still fully legible.

## User Stories

1. As a mission debugger, I want the banner to take up noticeably less vertical space, so that
   more of my widgets and their results are visible without scrolling.
2. As a mission debugger, I want the banner to keep communicating the same meaning (the tool's
   purpose: live Lua injection and debugging into a DCS mission), so that shrinking it doesn't
   turn it into a meaningless decorative strip.
3. As a mission debugger, I want the title ("dcs-bridge webui") and the tagline ("WEBUI INJECTEUR
   LUA EN LIGNE (TEMPS RÉEL)") to both remain fully readable at the new, shorter height.
4. As a screen-reader user, I want the banner's accessible description to stay accurate, so that
   a resize of the underlying image doesn't leave stale or misleading alt text behind.
5. As a maintainer, I want this change scoped to the image asset alone, so that a future banner
   revision doesn't have to reconcile a CSS crop/`object-fit` rule with whatever the image itself
   already does.

## Implementation Decisions

- **New asset, not a CSS crop.** The alternative considered during grilling was constraining the
  existing (taller) image with `max-height` + `object-fit: cover`/`object-position` in CSS. Instead,
  the user supplied a full recomposition of the same content at a wider native ratio — this avoids
  any risk of CSS-cropping away the title, tagline, or a scene, and needed no new theming
  mechanism (no `object-fit`, no `max-height` introduced).
- **In-place replacement, same filename.** The new image replaces `frontend/public/banner.jpg` at
  the same path — `BrandingHeader.svelte` needs no change, since it already references `/banner.jpg`
  with `width:100%; height:auto`, which adapts to any aspect ratio automatically.
- **No component or CSS change** — this PRD's entire implementation is the binary asset swap
  itself, committed through the project's standard branch+PR flow (per `CLAUDE.md`), even though
  there is no source-code diff.
- **`alt` text unchanged** — the image's semantic content (helicopters + tactical map + code
  injection, for live Lua injection and debugging) is unchanged, only recomposed at a shorter
  height, so the existing alt text remains accurate as-is.

## Testing Decisions

- Purely a binary-asset change, no logic modified — no new automated test needed.
- The existing `BrandingHeader.test.ts` (asserts exactly one `<img src="/banner.jpg">`, zero
  `<svg>`, and that the alt text never contains Eagle Dynamics/DCS World/Digital Combat Simulator)
  continues to pass unmodified, since neither the image path nor the alt text changes.
- Verified by live inspection in the browser (dev server), confirming the reduced footprint
  (~20% of viewport height vs. ~39% before) and that title/tagline/module/both scenes/the
  injection symbol all remain legible — consistent with how `FEAT-BRANDING-HEADER-REDESIGN` and
  `FEAT-PAGE-SURFACE-CONTRAST` were verified.

## Out of Scope

- Any CSS change to `BrandingHeader.svelte` (no `object-fit`, `max-height`, or crop rule needed).
- Any further redesign of the banner's composition — same content, just a shorter recomposition.
- Responsive/mobile-specific banner behavior — this app is desktop-only, `height:auto` already
  scales correctly at any viewport width.

## Further Notes

- No ADR: an asset swap, not an architectural decision.
- The trademark-risk constraint from `FEAT-BRANDING-HEADER-REDESIGN` (no DCS World / Eagle
  Dynamics logos or UI reproductions) is unaffected — same asset content, just recomposed, not a
  new source image.
- Originates from a direct, standalone user complaint ("le bandeau prend trop de place
  verticalement") — grilled per `CLAUDE.md`'s standing rule even though the eventual
  implementation turned out to need zero source-code changes.
- Follow-up (`feat/banner-hires-asset`): the user supplied a higher-resolution recomposition of
  the same banner (2240×479 — 2× the 1024×219 delivered here, identical composition and ~4.68:1
  aspect). Re-encoded to progressive JPEG q85 (712 KB → 194 KB) and swapped in place at
  `frontend/public/banner.jpg` — still a pure asset swap, no code change, `BrandingHeader.svelte`
  unchanged. Full frontend suite (100 tests), `svelte-check`, and `vite build` all green.
