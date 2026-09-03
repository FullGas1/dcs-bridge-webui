# 04 — Drop onto the `+` button, and multi-file drops

**Status:** todo

## Parent

`.backlog/FEAT-LUA-FILE-DROP/PRD.md`

## What to build

The `+` "add widget" button becomes a drop target, and drops of more than one file are handled
predictably on both target kinds.

- **Onto `+`**: one new widget per accepted `.lua` in the batch, appended to the grid in file
  order, each pre-filled with its file's text and (via ticket 02) showing its base name. A batch
  with zero accepted files creates no widget. No focus change and no scroll after a `+` drop.
- **Onto a widget**: when a batch contains more than one file, only the **first** accepted `.lua`
  is loaded into the hovered widget; the others are reported as ignored.
- `luaDrop.ts` gains the multi-file partition: given the files and the target kind
  (`widget` | `add-button`), it returns the scripts to load (base name + BOM-stripped text, in
  order) and the rejected entries (base name + reason), applying the `.lua` filter, the 512 KB
  cap, and the "first accepted only" rule for a `widget` target.
- The transient message (ticket 03) reports the aggregated outcome for these paths too
  (`3 files loaded`, `1 loaded · 2 ignored (multiple files on one widget)`, etc.).
- The `+` button gets the same file-only `dragover` highlight as a widget (ticket 03).

## Acceptance criteria

- [ ] Dropping N `.lua` files on `+` creates N new widgets in file order, each pre-filled with
      the right file's contents and showing the right base name.
- [ ] Dropping a mix of `.lua` and non-`.lua` (or oversized) files on `+` creates only the
      accepted count and shows one aggregated message covering the skipped ones.
- [ ] Dropping a batch with no accepted `.lua` on `+` creates no widget and shows the message.
- [ ] A `+` drop does not move focus and does not scroll the page.
- [ ] Dropping multiple files on a single widget loads only the first accepted `.lua` and shows a
      message that the rest were ignored.
- [ ] The `+` button highlights while a file is dragged over it and not while text is dragged.
- [ ] `luaDrop.ts` unit coverage for the multi-file partition: order preserved, mixed
      accept/reject, `add-button` keeps all accepted while `widget` keeps only the first.
- [ ] `Grid.svelte` component coverage for N-widgets-from-`+` and the mixed-batch message (prior
      art: `Grid.test.ts`).

## Blocked by

- Ticket 01 (drop infrastructure and `luaDrop.ts`)
- Soft: ticket 03 provides the message bar these paths report into; can be built before 03 with
  silent skips and wired to the bar when 03 lands, but simplest after 03.
