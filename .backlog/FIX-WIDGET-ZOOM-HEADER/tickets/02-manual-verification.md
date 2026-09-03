# 02 — Manual verification (HITL)

**Status:** done
**Type:** HITL — jsdom does no layout

## Parent

`.backlog/FIX-WIDGET-ZOOM-HEADER/PRD.md`

## Acceptance criteria

- [x] `Ctrl`+scroll a widget up to 220% → the editor and result text grow; the header (number,
      file name, `%`, every button) stays exactly its 100% size.
- [x] The header `%` readout stays small and clicking it resets the widget to 100%.
- [x] A zoomed widget's collapsed editor still caps at ~30 lines; Expand / Collapse still work.
- [x] `Ctrl`+scroll down a widget to 40% still shrinks the editor/result, header unchanged.
- [x] Page zoom (`Ctrl`+scroll away from a widget) still behaves as before.
- [x] Chrome + Firefox.

## Blocked by

- Ticket 01
