<script lang="ts">
  import Dot from "./Dot.svelte";
  import Icon from "./Icon.svelte";
  import Key from "./Key.svelte";
  import { activeRun, session as sessionApi, session, now, elapsedMs } from "../stores/session";
  import { formatDuration } from "../timer";
  import { onMount, tick } from "svelte";

  export let onClose: () => void;

  let value = "";
  let inputEl: HTMLInputElement;
  let highlight = 0;

  $: recent = (() => {
    const all = ($session.session?.runs ?? [])
      .flatMap((r) => r.drops.map((d) => d.text))
      .reverse();
    const seen = new Set<string>();
    const dedup: string[] = [];
    for (const t of all) {
      if (seen.has(t)) continue;
      seen.add(t);
      dedup.push(t);
      if (dedup.length >= 6) break;
    }
    return dedup;
  })();

  $: filtered = value
    ? recent.filter((r) => r.toLowerCase().includes(value.toLowerCase()))
    : recent;

  $: liveTime = $activeRun ? formatDuration(elapsedMs($activeRun, $now)) : "—";
  $: activeLabel = $activeRun?.label ?? $session.session?.default_label ?? "—";
  $: runIdx = $session.session ? $session.session.runs.length : 0;

  onMount(async () => {
    await tick();
    inputEl?.focus();
  });

  function commit(text: string) {
    const t = text.trim();
    if (!t) return onClose();
    sessionApi.logDrop(t);
    onClose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && highlight < filtered.length && value === "") {
        commit(filtered[highlight]);
      } else {
        commit(value);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight = Math.min(filtered.length - 1, highlight + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight = Math.max(0, highlight - 1);
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="backdrop" on:click={onClose} role="presentation">
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true">
    <div class="head">
      <Dot color="var(--accent)" size={6} />
      <span class="caption">Log a drop</span>
      <span class="sep">·</span>
      <span class="ctx">Run #{runIdx} · {activeLabel}</span>
      <div class="spacer" />
      <Key>Esc</Key>
    </div>

    <div class="input-wrap">
      <span class="prompt">›</span>
      <input
        bind:this={inputEl}
        bind:value
        on:keydown={onKey}
        placeholder="Type a drop name…"
      />
      <span class="caret" />
    </div>

    {#if filtered.length > 0}
      <div class="list">
        <div class="list-head">Recent</div>
        {#each filtered as t, i}
          <button
            class="list-item"
            class:highlight={i === highlight}
            on:click={() => commit(t)}
          >
            <Icon name="sparkle" size={10} stroke={i === highlight ? "var(--accent)" : "var(--fg-3)"} />
            <span class="t">{t}</span>
            {#if i === highlight}
              <span class="hint">↵ to save</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <div class="foot">
      <span>↑↓ navigate · ↵ save · Esc cancel</span>
      <div class="spacer" />
      <span class="num live">{liveTime}</span>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(8, 9, 11, 0.62);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 50;
  }
  .modal {
    width: 480px;
    background: var(--bg-2);
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow:
      0 24px 48px -12px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(224, 181, 104, 0.06);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .caption {
    font-size: 11px;
    color: var(--fg-2);
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }
  .sep {
    font-size: 11px;
    color: var(--fg-3);
  }
  .ctx {
    font-size: 11px;
    color: var(--fg-3);
  }
  .spacer {
    flex: 1;
  }
  .input-wrap {
    padding: 14px 16px;
    background: var(--bg-0);
    border: 1px solid var(--accent);
    border-radius: 8px;
    box-shadow: 0 0 0 3px rgba(224, 181, 104, 0.1);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .prompt {
    color: var(--accent);
    font-size: 16px;
    line-height: 1;
  }
  input {
    flex: 1;
    background: transparent;
    border: 0;
    outline: none;
    color: var(--fg);
    font-size: 15px;
    font-weight: 500;
    font-family: var(--font-ui);
  }
  input::placeholder {
    color: var(--fg-3);
  }
  .caret {
    width: 1px;
    height: 16px;
    background: var(--accent);
    animation: blink 1s steps(2) infinite;
    margin-left: 1px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0;
  }
  .list-head {
    font-size: 10px;
    color: var(--fg-3);
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 6px;
    padding-left: 4px;
  }
  .list-item {
    all: unset;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 6px;
    background: transparent;
    color: var(--fg-2);
    font-size: 12px;
    cursor: pointer;
  }
  .list-item:hover,
  .list-item.highlight {
    background: var(--bg-3);
    color: var(--fg);
  }
  .t {
    flex: 1;
  }
  .hint {
    font-size: 10px;
    color: var(--fg-3);
  }
  .foot {
    display: flex;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid var(--line-soft);
    font-size: 11px;
    color: var(--fg-3);
  }
  .live {
    color: var(--fg-2);
  }
</style>
