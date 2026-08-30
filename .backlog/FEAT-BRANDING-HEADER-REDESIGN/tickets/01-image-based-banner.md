# 01 — Image-based banner

**Status:** done

## What to build

Replace `BrandingHeader.svelte`'s hand-drawn inline SVG with the supplied banner image
(`frontend/public/banner.jpg`) — a two-scene composition (helicopters/flight side, generic
tactical-map side, a code-injection motif crossing the seam between them, app name and tagline
overlaid) built to the brief worked out in this lot's grilling.

- Render the image (`<img>` or CSS `background-image`) instead of the SVG markup.
- Update `alt`/`aria-label` to a faithful one-line summary of the new composition — still no DCS
  World / Eagle Dynamics trademarked term in that text.
- The component's surrounding chrome (container, spacing) keeps using the project's existing CSS
  variables; the image itself is a fixed asset, not themed for dark/light mode.
- Update `BrandingHeader.test.ts`'s two existing tests to match the new reality (see Acceptance
  criteria) rather than leaving them broken or bypassing them.
- The page's separate `<h1>dcs-bridge-webui</h1>` header (`App.svelte`) is redundant once the
  banner image itself contains the app name — removed along with its now-dead CSS
  (`.app-header`, `h1` rules in `app.css`).

## Acceptance criteria

- [ ] The banner renders `banner.jpg` visibly in the page header, in both light and dark mode
      (verified live in the browser, not just by test).
- [ ] `BrandingHeader.test.ts`'s "no external asset requests" test is updated to assert exactly
      one `<img>` referencing the local `banner.jpg` (not a remote URL) and zero `<svg>` elements.
- [ ] `BrandingHeader.test.ts`'s trademark-guard test keeps checking the accessible text
      (`alt`/`aria-label`) for "eagle dynamics" / "dcs world" / "digital combat simulator", with
      the now-inapplicable `.png`/`.jpg`/`.jpeg` file-reference check removed (a local asset
      filename is expected now).
- [ ] No new runtime dependency (icon library, web font) is introduced.
- [ ] Full frontend test suite and type-check both pass.

## Blocked by

None - can start immediately
