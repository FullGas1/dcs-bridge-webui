# 04 — session persistence via localStorage

**Status:** done

## What to build

Persist the grid's open widgets and their current script content to the browser's
`localStorage`, restoring them on page load. This is purely a browser-side concern — nothing
routes through the backend. A page reload (or closing and reopening the tab) should reconstruct
the same set of widgets, in the same order, with the same script text, rather than resetting to
a single empty widget.

## Acceptance criteria

- [ ] With three widgets open, each containing different script text, reloading the page
      restores all three, in the same order, with their script text intact.
- [ ] Closing a widget and reloading does not bring the closed widget back.
- [ ] A completely fresh browser profile (no existing `localStorage` entry) still falls back to
      the ticket 03 default of one empty widget.
- [ ] In-flight queue/running state is not claimed to persist across a reload (only script
      content and the set of open widgets) — a reload leaves all restored widgets idle.

## Blocked by

- Ticket 03 (multi-widget grid and injection queue)
