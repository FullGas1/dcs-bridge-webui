<script lang="ts">
  import { untrack } from 'svelte';
  import { Prec } from '@codemirror/state';
  import { EditorView, keymap } from '@codemirror/view';
  import { basicSetup } from 'codemirror';
  import { StreamLanguage } from '@codemirror/language';
  import { lua } from '@codemirror/legacy-modes/mode/lua';
  import { MAX_COLLAPSED_LINES } from './layoutConstants';

  interface Props {
    initialValue: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onInjectRequest?: () => void;
    // Ticket 02 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): reports the height the editor's *collapsed*
    // container should be constrained to, or null to let it size naturally to its own content
    // (the common case, under MAX_COLLAPSED_LINES - no computation needed, and no risk of
    // under/over-estimating chrome that doesn't belong to a single line, like CodeMirror's own
    // top/bottom content padding). Only at/over the threshold is an explicit px height reported.
    // Computed here (not from Widget.svelte's raw script text) because it needs
    // `view.defaultLineHeight`, a value measured on the actually-rendered instance (current
    // font/zoom), not a hardcoded px-per-line ratio.
    onHeightChange?: (px: number | null) => void;
  }

  let { initialValue, onChange, onFocus, onInjectRequest, onHeightChange }: Props = $props();

  // Read once, deliberately: this editor is uncontrolled after mount (see setValue() for the
  // imperative escape hatch templates use) so typing doesn't fight a reactive prop.
  const initial = untrack(() => initialValue);

  let container: HTMLDivElement | undefined;
  let view: EditorView | undefined;

  $effect(() => {
    function reportHeight(): void {
      if (!view) return;
      const lineCount = view.state.doc.lines;
      if (lineCount <= MAX_COLLAPSED_LINES) {
        // Natural sizing - no chrome/padding arithmetic needed or to get wrong.
        onHeightChange?.(null);
        return;
      }
      // At/over the cap: derive the chrome overhead (CodeMirror's own top/bottom content
      // padding, gutter, etc.) from a real measurement instead of guessing a constant. Measuring
      // `container` itself (not view.contentDOM or view.contentHeight) captures CodeMirror's
      // *entire* rendered chrome, whichever internal layer happens to carry it. .scrollHeight
      // also forces the browser to complete any pending layout before returning, unlike
      // view.contentHeight which can read stale (observed live).
      //
      // FIX-EDITOR-DROP-HEIGHT: right after a bulk setValue() (a dropped file, a loaded template)
      // the new lines are not laid out yet, so scrollHeight reads short and this subtraction goes
      // negative. A negative `height:` is dropped by the browser, leaving the editor to grow to
      // its full content and stay there (reportHeight only re-runs on docChanged, not on an
      // Expand/Collapse toggle). Clamp the chrome at zero: worst case the collapsed editor is
      // ~8px shorter than ideal for one frame, never uncapped.
      const fullContentHeight = container?.scrollHeight ?? 0;
      const chrome = Math.max(0, fullContentHeight - lineCount * view.defaultLineHeight);
      onHeightChange?.(MAX_COLLAPSED_LINES * view.defaultLineHeight + chrome);
    }

    view = new EditorView({
      doc: initial,
      parent: container,
      extensions: [
        basicSetup,
        StreamLanguage.define(lua),
        // Highest precedence: this app-level "inject" shortcut must win over any editor-internal
        // binding that might otherwise claim Ctrl-Enter first.
        Prec.highest(
          keymap.of([
            {
              key: 'Ctrl-Enter',
              run: () => {
                onInjectRequest?.();
                return true;
              },
            },
          ]),
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
            reportHeight();
          }
          if (update.focusChanged && update.view.hasFocus) {
            onFocus?.();
          }
        }),
      ],
    });

    // Initial report so the container is correctly sized before the user's first edit, not just
    // after it.
    reportHeight();

    return () => view?.destroy();
  });

  export function getValue(): string {
    return view?.state.doc.toString() ?? initial;
  }

  export function setValue(next: string): void {
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  }

  export function focus(): void {
    view?.focus();
  }
</script>

<div class="cm-editor-container" bind:this={container}></div>
