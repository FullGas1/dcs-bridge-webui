# FEAT-BRANDING-HEADER-REDESIGN — a banner that sells the product, not just names it

**Status:** ready-for-agent

## Problem Statement

The page's banner is a thin, minimal line drawing (a helicopter silhouette, a dashed arrow, a
server icon) that reads as a diagram, not a banner — it doesn't make a first-time visitor want
to use the tool, and it doesn't actually show what the tool *does* (inject Lua into a live
mission and see the result) at a glance.

## Solution

A richer, more polished banner — still 100% original vector artwork (no real DCS World / Eagle
Dynamics imagery, still no external image assets) — composed as two scenes meeting at a diagonal
seam: one evoking flight (a more detailed helicopter silhouette, sky elements), the other evoking
a tactical overview (a generic map/grid motif with position markers — not a reproduction of DCS's
own F10 map UI). A code-to-result signal, using the existing pulsing-dot motif, visibly crosses
the seam from the flight/code side toward the tactical side, symbolizing the injection → result
loop that's the actual point of the tool. The app's name sits over both halves.

## User Stories

1. As a first-time visitor, I want the banner to look like a polished product, not a technical
   diagram, so that my first impression matches what a "turnkey" tool implies.
2. As a first-time visitor, I want the banner to hint at what the tool actually does (inject
   code into a live mission, see a result), so that I understand its purpose before reading any
   text.
3. As a visitor, I want the banner's helicopter/flight motif kept (not dropped), so that the
   tool's DCS/rotary-wing context stays visually present even though it's not the whole story.
4. As a visitor, I want a visual element suggesting "live code injection", integrated into the
   scene rather than a separate icon off to the side, so that it reads as one coherent image, not
   a diagram with labeled parts.
5. As a visitor, I want a visual element suggesting "the debugging feedback loop" (see a result
   come back), so that both halves of the tool's value — inject and see what happened — show up.
6. As a maintainer, I want the banner to still contain zero DCS World / Eagle Dynamics
   trademarked references (names, real UI reproductions, external image files), so that the
   trademark-risk decision already made for this component stays honored under the new design.
7. As a maintainer, I want the banner to keep using the project's existing theme variables (not
   new hardcoded colors), so that it still renders correctly in both light and dark mode without
   a second, parallel color system to maintain.
8. As a screen-reader user, I want the banner's `aria-label` updated to accurately describe the
   new composition, so that it doesn't describe an image that no longer matches what's shown.
9. As a maintainer, I want no new runtime dependency (icon library, font, binary asset) added
   just for this banner, so that the app's turnkey single-exe packaging and offline behavior
   aren't affected.

## Implementation Decisions

- **Still a single hand-drawn inline SVG** in the banner component — no `<img>`, no
  background-image URL, no external font or icon library. Matches the component's existing
  approach and the constraint its own existing test already enforces (see Testing Decisions).
- **Two-scene diagonal composition**: a flight/sky scene and a tactical/map scene, meeting at a
  vertical-ish oblique seam (not horizontal) with a soft color transition at the join — an SVG
  gradient, not a blur filter (consistent with the project's flat, thin-stroke aesthetic; a true
  gaussian blur would be the odd one out stylistically).
- **The tactical scene is an invented, generic map/grid motif with a few position markers** — not
  a redrawing of DCS's own F10 map interface. It should read as "a tactical overview," not as a
  specific reproduction of any real DCS UI.
- **The helicopter motif is kept and made more detailed** (not replaced by a code/terminal glyph)
  — richer than today's thin-line silhouette, but still a silhouette/line-art treatment
  consistent with the rest of the illustration, not a literal aircraft likeness.
- **A signal crosses the seam**, reusing the existing pulsing-dot (`--accent`) motif from today's
  banner, visually connecting a "code" cue on the flight/left side to the tactical/right side —
  this is the composition's stand-in for both "code injection" (signal traveling toward the
  mission) and "debugging feedback" (the same loop, read as injection-then-result).
- **App name overlaid across both halves**, legible against either background.
- **Color**: exclusively the project's existing CSS variables (`--text-h`, `--accent`,
  `--border`, `--bg`, already dark/light-aware via `prefers-color-scheme` in `app.css`) — no new
  hardcoded colors, no multi-color gradient that would fight the existing minimal palette.
- **`aria-label` updated** to a faithful one-line summary of the new composition (not an
  exhaustive description of every element).

## Testing Decisions

- This is a purely visual component with no logic — verified by live inspection in the browser
  (light and dark mode), not a pixel-rendering test.
- Two existing tests in `BrandingHeader.test.ts` are the real guardrails here and must keep
  passing unchanged: one asserting exactly one inline `<svg>` and zero `<img>` elements (no
  external asset requests), and one explicitly asserting the markup never contains any DCS World
  / Eagle Dynamics trademarked term or an image file reference (`.png`/`.jpg`/`.jpeg`) — this is
  the automated form of the trademark-risk decision this redesign must keep honoring.
- No new automated test is needed for the visual content itself.

## Out of Scope

- Any real photo, screenshot, or downloaded image asset (tooling and trademark-risk constraints
  both rule this out — see Further Notes).
- A literal reproduction of DCS World's own F10 map interface.
- Replacing the helicopter motif with a different central symbol (e.g. a terminal/code glyph as
  the main subject) — it stays, just more detailed.
- Any new icon library, web font, or binary asset dependency.

## Further Notes

- No ADR: purely visual/UX, not an architectural decision — considered explicitly during
  grilling and declined.
- This redesign reopens, but does not reverse, a decision already made once for this exact
  component (see its own code comment): no real DCS World / Eagle Dynamics imagery, for trademark
  risk. What changes is the level of illustrative detail (richer, still 100% original vector
  art), not the constraint itself — confirmed explicitly during grilling after the user's first
  idea (blending a real helicopter photo with a real F10 map screenshot) ran into two compounding
  blockers: no image search/fetch/edit tooling available in this session, and the F10 map
  specifically being exactly the kind of DCS-engine-rendered UI asset the original decision
  exists to avoid, regardless of cropping/blurring.
