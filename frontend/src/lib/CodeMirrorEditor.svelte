<script lang="ts">
  import { untrack } from 'svelte';
  import { Prec } from '@codemirror/state';
  import { EditorView, keymap } from '@codemirror/view';
  import { basicSetup } from 'codemirror';
  import { StreamLanguage } from '@codemirror/language';
  import { lua } from '@codemirror/legacy-modes/mode/lua';

  interface Props {
    initialValue: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onInjectRequest?: () => void;
  }

  let { initialValue, onChange, onFocus, onInjectRequest }: Props = $props();

  // Read once, deliberately: this editor is uncontrolled after mount (see setValue() for the
  // imperative escape hatch templates use) so typing doesn't fight a reactive prop.
  const initial = untrack(() => initialValue);

  let container: HTMLDivElement | undefined;
  let view: EditorView | undefined;

  $effect(() => {
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
          }
          if (update.focusChanged && update.view.hasFocus) {
            onFocus?.();
          }
        }),
      ],
    });

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
