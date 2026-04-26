<script lang="ts">
  import Icon from "./Icon.svelte";
  export let kind: "primary" | "secondary" = "secondary";
  export let icon: string | undefined = undefined;
  export let full: boolean = false;
  export let hotkey: string | undefined = undefined;
  export let danger: boolean = false;

  $: isPrimary = kind === "primary";
</script>

<button
  on:click
  class="btn"
  class:primary={isPrimary}
  class:full
  class:danger
>
  {#if icon}
    <Icon name={icon} size={13} stroke={isPrimary ? "#1A1206" : "currentColor"} />
  {/if}
  <span class="label"><slot /></span>
  {#if hotkey}
    <span class="hotkey">{hotkey}</span>
  {/if}
</button>

<style>
  .btn {
    all: unset;
    cursor: pointer;
    padding: 9px 14px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--bg-2);
    color: var(--fg-1);
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: 0.1px;
    flex-shrink: 0;
    white-space: nowrap;
    transition: background 120ms, border-color 120ms;
  }
  .btn:hover {
    background: var(--bg-3);
  }
  .btn.primary {
    border-color: var(--accent-2);
    background: linear-gradient(180deg, #e5bc72 0%, #c99a4f 100%);
    color: #1a1206;
    font-weight: 600;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15) inset, 0 0 0 1px rgba(224, 181, 104, 0.15);
  }
  .btn.primary:hover {
    background: linear-gradient(180deg, #ecc37a 0%, #d2a356 100%);
  }
  .btn.full {
    padding: 14px 16px;
    font-size: 14px;
    width: 100%;
  }
  .btn.danger {
    color: var(--danger);
    border-color: rgba(201, 112, 100, 0.4);
  }
  .label {
    white-space: nowrap;
  }
  .hotkey {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--bg-0);
    border: 1px solid var(--line);
    color: var(--fg-2);
    margin-left: 4px;
  }
  .btn.primary .hotkey {
    background: rgba(26, 18, 6, 0.18);
    border-color: rgba(26, 18, 6, 0.25);
    color: #1a1206;
  }
</style>
