<script lang="ts">
  import type { Template } from './api';

  interface Props {
    templates: Template[];
    onSelect: (template: Template) => void;
    onDelete: (id: string) => void;
  }
  let { templates, onSelect, onDelete }: Props = $props();

  let open = $state(false);

  function toggle(): void {
    open = !open;
  }

  function select(template: Template): void {
    onSelect(template);
    open = false;
  }

  function remove(event: MouseEvent, id: string): void {
    event.stopPropagation();
    onDelete(id);
  }
</script>

<div class="template-dropdown">
  <button type="button" onclick={toggle} aria-haspopup="listbox" aria-expanded={open}>
    Templates
  </button>
  {#if open}
    <ul class="template-list" role="listbox">
      {#if templates.length === 0}
        <li class="template-empty">No templates yet</li>
      {/if}
      {#each templates as template (template.id)}
        <li>
          <button type="button" class="template-name" onclick={() => select(template)}>
            {template.name}
          </button>
          <button
            type="button"
            class="template-delete"
            aria-label={`Delete template ${template.name}`}
            onclick={(e) => remove(e, template.id)}
          >
            &times;
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .template-dropdown {
    position: relative;
  }

  .template-list {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 10;
    margin: 4px 0 0;
    padding: 4px;
    list-style: none;
    min-width: 12em;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .template-list li {
    display: flex;
    align-items: center;
  }

  .template-name {
    flex: 1;
    text-align: left;
    border: none;
    background: none;
    padding: 4px 6px;
  }

  .template-delete {
    border: none;
    background: none;
    padding: 4px 6px;
    line-height: 1;
    opacity: 0.6;
  }
  .template-delete:hover {
    opacity: 1;
  }

  .template-empty {
    padding: 4px 6px;
    opacity: 0.6;
    font-size: 13px;
  }
</style>
