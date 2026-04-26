<script lang="ts">
  import Icon from "./Icon.svelte";
  import Dot from "./Dot.svelte";

  export let session: string;
  export let sessionTime: string;
  export let running: boolean;
  export let onToggle: () => void;
  export let onEnd: () => void;
</script>

<div class="header">
  <div class="col">
    <span class="caption">Session</span>
    <span class="title">{session}</span>
  </div>
  <div class="divider" />
  <div class="time">
    <Dot color={running ? "var(--accent)" : "var(--fg-3)"} size={6} glow={running} />
    <span class="num" class:active={running}>{sessionTime}</span>
    <span class="elapsed">elapsed</span>
  </div>
  <div class="spacer" />
  <button class="btn" on:click={onToggle}>
    <Icon name={running ? "pause" : "play"} size={11} />
    {running ? "Pause session" : "Resume"}
  </button>
  <button class="btn ghost" on:click={onEnd}>End session</button>
</div>

<style>
  .header {
    height: 60px;
    flex-shrink: 0;
    padding: 0 24px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--bg-1);
  }
  .col {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .caption {
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }
  .title {
    font-size: 14px;
    color: var(--fg);
    font-weight: 500;
  }
  .divider {
    height: 24px;
    width: 1px;
    background: var(--line);
    margin: 0 4px;
  }
  .time {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .time .num {
    font-size: 14px;
    color: var(--fg-2);
  }
  .time .num.active {
    color: var(--fg);
  }
  .elapsed {
    font-size: 11px;
    color: var(--fg-3);
    margin-left: 2px;
  }
  .spacer {
    flex: 1;
  }
  .btn {
    all: unset;
    cursor: pointer;
    padding: 7px 12px;
    border-radius: 6px;
    border: 1px solid var(--line);
    color: var(--fg-1);
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-2);
    transition: background 120ms;
  }
  .btn:hover {
    background: var(--bg-3);
  }
  .btn.ghost {
    padding: 7px 14px;
    color: var(--fg-2);
    background: transparent;
    border-color: var(--line);
  }
  .btn.ghost:hover {
    background: var(--bg-2);
    color: var(--fg-1);
  }
</style>
