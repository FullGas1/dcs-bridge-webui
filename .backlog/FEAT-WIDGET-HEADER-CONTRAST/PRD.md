# FEAT-WIDGET-HEADER-CONTRAST — readable widget-header buttons

**Status:** merged (PR #21)

**Branch:** `feat/widget-header-contrast`

Style-only. From a direct user complaint: the widget-header buttons were the card's own
colour with a border lighter than the fill, so they read as flat text, not controls.

## Solution

- The `.widget-header` band is recessed a step below the card (`#aeb3ba` light / `#191b22` dark)
  so it reads as a toolbar.
- Every header control (including the ones from `ExpandToggle` / `TemplateDropdown`, hence
  `:global`) sits on a **light fill** with a defined border — labels now pop.
- **Send** — the one consequential action (it injects into a live mission) — is a **deep red**
  (`#a32d2d` light / `#b83a37` dark, white text), so the primary action is unmistakable.
- Dark mode carries equivalent values.

Chosen from a live mock-up comparison (option "C" + Send red brique).

## Out of Scope

- The global `button` style elsewhere (connection banner, zoom control, dialogs) — unchanged.
- Any change to what the buttons do, or the header layout / wrapping.
- Icon buttons / an overflow menu (considered in the mock-up, not taken).

## Testing

CSS only. `npm run check`, `npm test` (185), `npm run build` green; verified live in the browser
in both light and dark mode.
