<script lang="ts">
  // Ticket 01 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): one shared button, instantiated once per area
  // (editor, result) instead of writing the same toggle-button markup twice.
  interface Props {
    expanded: boolean;
    onToggle: () => void;
    area: string;
  }

  let { expanded, onToggle, area }: Props = $props();
</script>

<button type="button" onclick={onToggle}>{expanded ? 'Collapse' : 'Expand'} {area}</button>
