# 02 — Dynamic collapsed height for the editor and the result

**Status:** ready

## What to build

While an area (editor or result — see ticket 01's independent expand states) is collapsed, its
height should track its actual content up to a shared ~30-line threshold, instead of always
reserving the full fixed block regardless of how short the content is. At or above the
threshold, today's fixed cap behavior stays (scrollable inside, `Expand` is the way to see it
all).

- Tracked live: the editor recalculates on every document change (reuse
  `CodeMirrorEditor.svelte`'s existing `updateListener`, which already fires on every
  `docChanged` — no new hook needed there). The result recalculates whenever a new run's output
  replaces the previous one.
- Height formula uses a real measured line height, not a hardcoded ratio: the editor reads
  CodeMirror's own `EditorView.defaultLineHeight` (measured on the actually-rendered instance —
  current font, current zoom, everything included), so the calculation stays correct at any zoom
  level without a separate synchronization step with ticket 03. This calculation belongs inside
  `CodeMirrorEditor.svelte` (it needs `view`), not derived from raw script text elsewhere. The
  result (not a CodeMirror instance) uses the equivalent real, computed CSS line-height of its
  own text element.
- Formula: `height = min(lineCount, 30) × measuredLineHeight + fixed chrome (header/padding)`,
  the same formula and the same ~30-line cap for both areas.
- The result's current fixed 8-line cap is retired in favor of this same ~30-line threshold —
  bringing it in line with the editor instead of being a separate, smaller, unrelated limit.
- Dynamic height only governs the collapsed state (per ticket 01's per-area expanded/collapsed
  state) — an expanded area is unaffected by this calculation (it's already unbounded).

## Acceptance criteria

- [ ] A 3-line script's editor, while collapsed, is sized to roughly 3 lines tall, not the full
      ~30-line block.
- [ ] Typing additional lines into a collapsed editor grows its height live, up to the ~30-line
      cap; deleting lines shrinks it back down live.
- [ ] A short result (e.g. a 2-line serialized table), while collapsed, is sized to roughly its
      own content, not the old fixed 8-line cap.
- [ ] A script or result at or beyond the ~30-line threshold, while collapsed, keeps today's
      fixed-cap, scroll-inside behavior — it does not grow past the cap just from more lines
      being added.
- [ ] An expanded area (ticket 01) is unaffected by this ticket's height calculation — it stays
      fully unbounded regardless of line count.
- [ ] The height calculation is covered by its own tests in a new `CodeMirrorEditor.test.ts` (no
      such file exists today) for the editor side, and equivalent coverage for the result side —
      asserting actual rendered/computed height in response to content changes, not internal
      implementation details of the formula.

## Blocked by

- Ticket 01 (independent Expand/collapse per area) — this ticket's dynamic height needs each
  area's own collapsed/expanded state to know when to apply.
