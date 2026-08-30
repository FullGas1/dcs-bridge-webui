# 01 — Independent Expand/collapse per area

**Status:** ready

## What to build

Replace the single whole-widget "Expand" button (today: one `onToggleExpand`/`expanded` prop
that grows the editor and the result together via `data-expanded` on the whole widget) with two
independent controls — one for the editor, one for the result — built on one shared, reused
mechanism (a component or hook instantiated twice), not two separately-written implementations.

- Each area tracks its own expanded/collapsed state, toggled by its own button in the widget's
  toolbar.
- Expanding one area has no effect on the other's state.
- An expanded area reverts to unbounded height (`height: auto`, matching today's existing
  whole-widget behavior — showing the *entire* content, not a bigger-but-still-bounded box),
  exactly as the single Expand button already does today, just scoped to one area.
- A collapsed area, for this ticket, keeps today's existing fixed collapsed sizing (~30-line
  block for the editor, the current 8-line cap for the result) — dynamic collapsed-height sizing
  is ticket 02, not this one. This ticket only factors the expand mechanism itself.
- Where per-widget state (e.g. session persistence) currently stores a single `expanded` flag,
  it needs to become two — check `widgetSession.ts` / wherever widget state is currently
  persisted, and decide whether per-area expanded state is worth persisting across a reload the
  same way, or resets on reload like other transient UI state.

## Acceptance criteria

- [ ] The widget's toolbar shows two independent Expand/Collapse controls (editor, result)
      instead of the single current one.
- [ ] Expanding the result alone leaves the editor at its current collapsed size, and shows the
      result's entire content with no cap.
- [ ] Expanding the editor alone leaves the result at its current collapsed size, and shows the
      editor's entire script with no cap.
- [ ] Collapsing an expanded area returns it to today's existing fixed collapsed size (not yet
      the dynamic sizing of ticket 02).
- [ ] The shared expand/collapse mechanism has its own focused test, exercised through both call
      sites (editor, result) rather than duplicating the same assertions twice.
- [ ] Existing tests referencing the single whole-widget `expanded`/`onToggleExpand` are updated
      to reflect the two independent controls; no regression in existing widget behavior beyond
      this change.

## Blocked by

None - can start immediately
