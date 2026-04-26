<script lang="ts">
  import Icon from "./Icon.svelte";
  import Key from "./Key.svelte";

  export let label: string;
  export let desc: string;
  export let chord: string;
  export let capturing: boolean = false;
  export let onClick: () => void;

  $: parts = chord.split("+").map((s) => s.trim()).filter(Boolean);
</script>

<div class="row">
  <div class="left">
    <span class="label">{label}</span>
    <span class="desc">{desc}</span>
  </div>
  <button class="capture" class:capturing on:click={onClick}>
    {#if capturing}
      <span class="caps">Press a chord…</span>
    {:else}
      <span class="keys">
        {#each parts as p, i}
          {#if i > 0}
            <span class="plus">+</span>
          {/if}
          <Key>{p}</Key>
        {/each}
      </span>
    {/if}
    <Icon
      name={capturing ? "keyboard" : "edit"}
      size={12}
      stroke={capturing ? "var(--accent)" : "var(--fg-3)"}
    />
  </button>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr 200px;
    align-items: center;
    gap: 16px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--line-soft);
  }
  .left {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .label {
    font-size: 13px;
    color: var(--fg-1);
  }
  .desc {
    font-size: 11px;
    color: var(--fg-3);
  }
  .capture {
    all: unset;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--bg-0);
    border: 1px dashed var(--line);
    border-radius: 6px;
    cursor: pointer;
    justify-content: space-between;
    transition: background 120ms, border-color 120ms;
  }
  .capture.capturing {
    background: var(--accent-glow);
    border-color: var(--accent);
  }
  .keys {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .plus {
    color: var(--fg-3);
    font-size: 11px;
  }
  .caps {
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
</style>
