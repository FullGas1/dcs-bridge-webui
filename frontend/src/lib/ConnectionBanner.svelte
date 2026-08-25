<script lang="ts">
  interface Props {
    /** Attempts to connect with this key; resolves to whether it worked. */
    onSubmit: (apiKey: string) => Promise<boolean>;
  }
  let { onSubmit }: Props = $props();

  let apiKey = $state('');
  let submitting = $state(false);
  let failed = $state(false);

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    submitting = true;
    failed = false;
    const connected = await onSubmit(apiKey);
    submitting = false;
    failed = !connected;
  }
</script>

<div class="connection-banner" role="alert">
  <p>Can't reach dcs-serve.</p>
  <p class="help">
    Open <code>dcs-serve.yaml</code> (created in the folder you launched <code>dcs-serve</code>
    from) and copy the <code>api_key</code> value.
  </p>
  <form onsubmit={handleSubmit}>
    <input type="text" bind:value={apiKey} placeholder="api_key" aria-label="api_key" />
    <button type="submit" disabled={submitting}>Connect</button>
  </form>
  {#if failed}
    <p class="failure" role="status">Still can't connect - check the key and try again.</p>
  {/if}
</div>

<style>
  .connection-banner {
    background: #fff3cd;
    color: #664d03;
    border-bottom: 1px solid #ffe69c;
    padding: 10px 16px;
    font-size: 14px;
  }
  .connection-banner p {
    margin: 0 0 6px;
  }
  .connection-banner code {
    font-family: var(--mono);
  }
  .connection-banner form {
    display: flex;
    gap: 8px;
  }
  .connection-banner input {
    flex: 1;
    max-width: 28em;
    font: inherit;
    padding: 4px 8px;
    border: 1px solid #ffe69c;
    border-radius: 4px;
  }
  .failure {
    color: #842029;
  }
</style>
