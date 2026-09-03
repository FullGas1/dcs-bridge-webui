# 02 — Manual verification (HITL)

**Status:** todo
**Type:** HITL — jsdom does no layout

## Parent

`.backlog/FIX-WIDGET-ZOOM-HEADER/PRD.md`

## Acceptance criteria

- [ ] `Ctrl`+scroll a widget up to 220% → the editor and result text grow; the header (number,
      file name, `%`, every button) stays exactly its 100% size.
- [ ] The header `%` readout stays small and clicking it resets the widget to 100%.
- [ ] A zoomed widget's collapsed editor still caps at ~30 lines; Expand / Collapse still work.
- [ ] `Ctrl`+scroll down a widget to 40% still shrinks the editor/result, header unchanged.
- [ ] Page zoom (`Ctrl`+scroll away from a widget) still behaves as before.
- [ ] Chrome + Firefox.

## Blocked by

- Ticket 01
