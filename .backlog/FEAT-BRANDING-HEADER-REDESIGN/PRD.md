# FEAT-BRANDING-HEADER-REDESIGN — a banner that sells the product, not just names it

**Status:** ready-for-agent

## Problem Statement

The page's banner is a thin, minimal line drawing (a helicopter silhouette, a dashed arrow, a
server icon) that reads as a diagram, not a banner — it doesn't make a first-time visitor want
to use the tool, and it doesn't actually show what the tool *does* (inject Lua into a live
mission and see the result) at a glance.

## Solution

A richer, more polished banner, composed as two scenes meeting at a diagonal seam: one evoking
flight (helicopters, sky), the other evoking a tactical overview (a generic map/grid motif with
position markers — not a reproduction of DCS's own F10 map UI), a code-injection motif crossing
the seam between them, and the app's name plus a one-line tagline ("Injecteur Lua en ligne (temps
réel)") over both halves.

**Revised mid-implementation**: the user supplied a finished banner image (`frontend/public/
banner.jpg`) built to this exact brief by an image-generation tool, rather than the hand-drawn
SVG originally scoped (see Further Notes) — this PRD's decisions below reflect that image as the
actual deliverable.

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

- **A single raster image (`frontend/public/banner.jpg`)**, not an inline SVG — the banner
  component renders it as an `<img>` (or CSS `background-image`) rather than hand-drawn vector
  markup. This is a deliberate departure from the component's prior "SVG only, no binary asset"
  approach (see Further Notes) and from what its existing test previously enforced — that test is
  updated in the same change (see Testing Decisions), not silently left to fail or bypassed.
- **The image already contains everything the composition called for**: helicopters (flight
  side), a generic invented tactical-map motif with position markers (map side, not a
  reproduction of DCS's own F10 UI), a code-injection visual crossing the diagonal seam between
  them, the app name, and a tagline. No further compositing needed.
- **No hand-tuning of the image's internal colors for dark/light mode** — it's a fixed photo-like
  asset, not a themeable vector; it renders the same regardless of the page's light/dark mode.
  The surrounding component chrome (container background, spacing) still uses the project's
  existing CSS variables.
- **`aria-label`/`alt` updated** to a faithful one-line summary of the new composition (not an
  exhaustive description of every element) — still no DCS World / Eagle Dynamics trademarked term
  in that text, consistent with the existing guard test.
- **File name and format**: saved as `banner.jpg` (a `.jfif`-suffixed save from the source tool
  was renamed for convention and tooling compatibility — `.jfif` is a valid JPEG variant but an
  unusual extension for a repo asset).

## Testing Decisions

- This is a purely visual component with no logic — verified by live inspection in the browser
  (light and dark mode), not a pixel-rendering test.
- `BrandingHeader.test.ts`'s two existing tests are both updated, deliberately, to match the new
  reality rather than left broken or silently bypassed:
  - The "no external asset requests" test flips: it now asserts exactly one `<img>` (pointing at
    the local `banner.jpg`, not a remote URL) and zero inline `<svg>`.
  - The trademark-guard test keeps its intent but drops the now-inapplicable
    `.png`/`.jpg`/`.jpeg` file-reference check (a local project asset referencing its own
    filename is expected now) — it still asserts the accessible text (`alt`/`aria-label`) never
    contains "eagle dynamics", "dcs world", or "digital combat simulator". A test can't scan
    image *pixels* for trademark content, so this remains a text-only guard, same as before.
- No new automated test is needed for the visual content itself.

## Out of Scope

- Any image content sourced by fetching/downloading from the web during implementation (still
  ruled out by tooling — the actual asset used was supplied directly by the user as a file, not
  fetched by the agent).
- A literal reproduction of DCS World's own F10 map interface.
- Any new icon library or web font dependency.
- Hand-tuning the banner image itself for dark/light mode — it's a fixed asset (see
  Implementation Decisions).

## Further Notes

- No ADR: purely visual/UX, not an architectural decision — considered explicitly during
  grilling and declined.
- This redesign reopens, but does not reverse, a decision already made once for this exact
  component (see its own code comment): no real DCS World / Eagle Dynamics imagery, for trademark
  risk. The image actually used stays inside that constraint — generic military helicopters and
  an invented tactical-map motif, no Eagle Dynamics branding or reproduction of DCS's own UI.
- **Scope pivot mid-implementation**: grilling initially converged on a hand-drawn SVG (agent's
  own tooling can't fetch/edit real images, and reusing a real F10 map screenshot specifically
  was judged a trademark risk regardless of cropping/blurring — both points stand). The user then
  supplied a finished image, generated by a separate image tool to this exact brief, as a file
  (`frontend/public/banner.jpg`) — not fetched or edited by the agent, sidestepping the tooling
  gap entirely, and not containing the DCS-World-specific asset (the F10 map) that was the actual
  trademark concern. The PRD was updated in place (not superseded by a new lot) to reflect the
  image-based implementation once the file was in hand.
