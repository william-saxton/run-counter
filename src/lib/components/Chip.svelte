<script lang="ts">
  export let active: boolean = false;
  export let removable: boolean = false;
</script>

<button class="chip" class:active on:click>
  <slot />
  {#if removable}
    <span class="x">×</span>
  {/if}
</button>

<style>
  .chip {
    all: unset;
    cursor: pointer;
    padding: 5px 11px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--bg-2);
    color: var(--fg-1);
    font-size: 12px;
    font-weight: 400;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 120ms, border-color 120ms;
  }
  .chip:hover {
    background: var(--bg-3);
  }
  .chip.active {
    border-color: var(--accent);
    background: var(--accent-glow);
    color: var(--accent);
    font-weight: 500;
  }
  .x {
    color: var(--fg-3);
    font-size: 10px;
  }
</style>
