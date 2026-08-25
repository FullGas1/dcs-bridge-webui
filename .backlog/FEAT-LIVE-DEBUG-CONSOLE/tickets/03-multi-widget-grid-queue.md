# 03 — multi-widget grid and injection queue

**Status:** open (ready-for-agent)

## What to build

Generalize ticket 02's single widget into a responsive grid of any number of widgets. A "+"
control sits directly below the last widget in the grid and adds a new empty widget; if every
widget is closed, that "+" becomes the grid's sole content (there is always at least one widget
reachable). Widgets are numbered by creation order ("Widget 1", "Widget 2", ...) with no
renaming, and each has a close button.

Each widget can be expanded in place within the grid (growing its span/height, reflowing the
grid) rather than going fullscreen — several widgets can be expanded concurrently, sharing the
available space. Each widget's editor/result area scrolls internally when its content exceeds
its current height; the page itself scrolls vertically to reach widgets below the fold.

Injections across all widgets now go through a single global FIFO queue — only one call to
`dcs-serve` is in flight at a time, regardless of which widget triggered it. A widget waiting in
the queue shows a distinct "queued" state from "running". Ticket 02's per-widget timeout and
stop button now also govern queue position: stopping a queued (not yet started) widget simply
removes it from the queue; the queue always advances automatically after a completion, timeout,
or cancellation.

## Acceptance criteria

- [ ] Clicking "+" (or the empty-grid placeholder) adds a new empty widget; each widget shows
      its creation-order number and a close button.
- [ ] Closing every widget leaves the grid showing only the "+" control — there is no state with
      zero widgets and no way to add one.
- [ ] Expanding two widgets at once grows both in place within the grid; neither hides the
      others, and the page's vertical scrollbar reaches widgets pushed below the fold.
- [ ] Triggering an injection from widget A, then immediately from widget B, runs A to
      completion before B starts; B shows a "queued" state in the meantime.
- [ ] Stopping a queued widget (not yet started) removes it from the queue without affecting the
      widget currently running.
- [ ] A timeout or cancellation on the running widget immediately starts the next queued widget,
      if any.

## Blocked by

- Ticket 02 (single-widget injection loop)
