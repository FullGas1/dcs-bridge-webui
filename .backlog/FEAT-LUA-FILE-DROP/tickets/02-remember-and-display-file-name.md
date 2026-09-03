# 02 — Remember and display the dropped file's name

**Status:** todo

## Parent

`.backlog/FEAT-LUA-FILE-DROP/PRD.md`

## What to build

A widget remembers the base name of the `.lua` file dropped into it and shows it in the header
next to the widget number (`Widget 3 — patrol_check.lua`). The name is a display label only —
never a path or a file handle (ADR 0005) — and survives a page reload.

- The widget gains an optional remembered name. Header renders `Widget {n} — {name}` when set,
  and the unchanged `Widget {n}` when not.
- Lifecycle:
  - set to the file's base name when a `.lua` is dropped on the widget (ticket 01's path);
  - replaced when a different `.lua` is dropped on the same widget;
  - set to the template's name (shown verbatim as a pseudo-file-name — no `.lua` appended, no
    slugification) when a template is loaded via the dropdown;
  - unchanged when the code is edited in the editor;
  - unchanged by "Memorize";
  - absent for a brand-new empty widget or one typed from scratch.
- Persistence: `StoredWidget` (and the in-memory widget record) gain an optional `filename`.
  `saveWidgets` writes it; `loadWidgets` reads it; the lenient parser still accepts stored
  entries that predate this field (those widgets load with no name).
- No provenance flag distinguishing a file name from a template name is stored (out of scope —
  a future "Save" lot adds one if needed).

## Acceptance criteria

- [ ] After a `.lua` is dropped on a widget, its header shows `Widget {n} — {base name}`.
- [ ] Dropping a second, differently-named `.lua` on the same widget updates the shown name.
- [ ] Editing the code after a drop leaves the shown name unchanged.
- [ ] Loading a template into the widget changes the shown name to the template's name, verbatim.
- [ ] "Memorize" does not change the shown name.
- [ ] A widget with no remembered name shows `Widget {n}` exactly as before this lot.
- [ ] The remembered name round-trips through a page reload.
- [ ] A widget state saved before this field existed still loads (as a name-less widget) — no
      crash, no lost widgets.
- [ ] `widgetSession.test.ts` is extended: an entry with `filename` round-trips; an entry without
      `filename` still loads.
- [ ] `Widget.svelte` component coverage for the header rendering in both states and for the
      template-load name swap (prior art: `Widget.test.ts`).

## Blocked by

- Ticket 01 (the widget drop path is what sets the name)
