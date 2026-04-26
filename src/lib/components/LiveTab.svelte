<script lang="ts">
  import Card from "./Card.svelte";
  import Chip from "./Chip.svelte";
  import Btn from "./Btn.svelte";
  import Dot from "./Dot.svelte";
  import Icon from "./Icon.svelte";
  import SectionLabel from "./SectionLabel.svelte";
  import Key from "./Key.svelte";
  import { activeRun, completedRuns, now, session, elapsedMs } from "../stores/session";
  import { settings } from "../stores/settings";
  import { formatDuration, formatRelative, average, fastest, slowest } from "../timer";
  import { session as sessionApi } from "../stores/session";

  export let onOpenDropModal: () => void;
  export let onAddCustomLabel: () => void;

  $: status = $activeRun?.status ?? "active";
  $: isRunning = status === "active";

  $: completedDur = $completedRuns
    .filter((r) => r.ended_at)
    .map((r) => (r.ended_at as number) - r.started_at - r.paused_ms);

  $: liveMs = $activeRun ? elapsedMs($activeRun, $now) : 0;
  $: avgMs = average(completedDur);
  $: fastMs = fastest(completedDur);
  $: slowMs = slowest(completedDur);
  $: totalRuns = $session.session ? $session.session.runs.length : 0;
  $: completedCount = $completedRuns.length;
  $: totalCompletedMs = completedDur.reduce((a, b) => a + b, 0);
  $: activeLabel = $activeRun?.label ?? $session.session?.default_label ?? "Mephisto";

  $: recent = ($session.session?.runs ?? []).slice().reverse();

  // collect drops across the active session, newest first
  $: allDrops = ($session.session?.runs ?? [])
    .flatMap((r) => r.drops.map((d) => ({ ...d, run_index: ($session.session?.runs ?? []).indexOf(r) + 1 })))
    .sort((a, b) => b.logged_at - a.logged_at);

  function onPick(label: string) {
    sessionApi.setActiveLabel(label);
  }
</script>

<div class="grid">
  <!-- Hero card -->
  <div class="hero-cell">
    <Card padding={22} class="hero">
      <div class="glow" />
      <div class="row top">
        <Dot color={isRunning ? "var(--accent)" : "var(--fg-3)"} size={6} glow={isRunning} />
        <span class="status">{isRunning ? "Running" : status === "paused" ? "Paused" : "Idle"}</span>
        <span class="sep">·</span>
        <span class="active-label">{activeLabel}</span>
        <div class="spacer" />
        <span class="num run-x">RUN {totalRuns} / SESSION</span>
      </div>

      <div class="row timer-row">
        <span class="num timer" class:running={isRunning}>{formatDuration(liveMs)}</span>
        <div class="aux">
          <span class="num aux-line">
            <span class="muted">avg </span>{completedDur.length ? formatDuration(avgMs) : "—"}
          </span>
          <span class="num aux-line dim">
            <span class="muted">fast </span>{completedDur.length ? formatDuration(fastMs) : "—"}
          </span>
        </div>
        <div class="spacer" />
        <div class="actions">
          <Btn kind="primary" icon="next" on:click={() => sessionApi.nextRun()}>Next run</Btn>
          <Btn icon={isRunning ? "pause" : "play"} on:click={() => sessionApi.togglePause()}>
            {isRunning ? "Pause" : "Resume"}
          </Btn>
        </div>
      </div>

      <div class="hint">
        <span class="num">
          {$settings.hotkeys.next_run} next · {$settings.hotkeys.toggle_pause} pause · {$settings.hotkeys.log_drop} log drop
        </span>
      </div>

      <div class="quick-pick">
        <SectionLabel>Quick-pick label</SectionLabel>
        <div class="chips">
          {#each $settings.saved_labels as l}
            <Chip active={l === activeLabel} on:click={() => onPick(l)}>{l}</Chip>
          {/each}
          <Chip on:click={onAddCustomLabel}>
            <Icon name="plus" size={10} stroke="var(--fg-2)" />
            <span class="muted">Custom</span>
          </Chip>
        </div>
      </div>
    </Card>
  </div>

  <!-- Drop logger -->
  <div class="drop-cell">
    <Card padding={16} class="drop-card">
      <SectionLabel>
        Drop logger
        <span slot="right"><Key>{$settings.hotkeys.log_drop}</Key></span>
      </SectionLabel>
      <button class="drop-input" on:click={onOpenDropModal}>
        <Icon name="plus" size={12} stroke="var(--fg-3)" />
        <span>Log a drop…</span>
      </button>

      <div class="scroll drops">
        {#if allDrops.length === 0}
          <div class="empty">No drops logged yet.</div>
        {:else}
          {#each allDrops as d}
            <div class="drop-item">
              <span class="num run-tag">R{d.run_index}</span>
              <span class="text">{d.text}</span>
              <span class="ago">{formatRelative($now - d.logged_at)}</span>
            </div>
          {/each}
        {/if}
      </div>
    </Card>
  </div>

  <!-- Recent runs -->
  <div class="recent-cell">
    <Card padding={16} class="recent">
      <SectionLabel>
        Recent runs
        <span slot="right" class="meta">
          {completedCount} runs · {formatDuration(totalCompletedMs)} total
        </span>
      </SectionLabel>
      <div class="recent-list scroll">
        {#each recent as r, i (r.id)}
          <div class="run-row" class:current={r.status !== "completed"}>
            <span class="num idx">#{($session.session?.runs ?? []).indexOf(r) + 1}</span>
            <span class="lbl" class:active={r.status !== "completed"}>{r.label ?? "—"}</span>
            <span class="num dur">
              {r.status === "completed" && r.ended_at
                ? formatDuration(r.ended_at - r.started_at - r.paused_ms)
                : formatDuration(elapsedMs(r, $now))}
            </span>
            <span class="drops" class:has={r.drops.length > 0}>
              {r.drops.length > 0 ? `${r.drops.length}◆` : "—"}
            </span>
          </div>
        {/each}
      </div>
    </Card>
  </div>
</div>

<style>
  .grid {
    flex: 1;
    min-height: 0;
    padding: 24px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 18px;
    overflow: auto;
  }
  .hero-cell {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    min-width: 0;
  }
  .drop-cell {
    grid-column: 2 / 3;
    grid-row: 1 / 3;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .recent-cell {
    grid-column: 1 / 2;
    grid-row: 2 / 3;
    min-height: 0;
    min-width: 0;
  }
  /* Stack the right rail under the hero on narrow windows */
  @media (max-width: 820px) {
    .grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
    }
    .hero-cell {
      grid-column: 1;
      grid-row: 1;
    }
    .drop-cell {
      grid-column: 1;
      grid-row: 2;
      max-height: 240px;
    }
    .recent-cell {
      grid-column: 1;
      grid-row: 3;
      min-height: 200px;
    }
  }
  :global(.hero) {
    position: relative;
    overflow: hidden;
  }
  :global(.drop-card) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  :global(.recent) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 88% -20%, rgba(224, 181, 104, 0.1), transparent 50%);
    pointer-events: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
  }
  .top .status {
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--fg-2);
  }
  .sep {
    font-size: 11px;
    color: var(--fg-3);
  }
  .active-label {
    font-size: 12px;
    color: var(--fg-1);
  }
  .spacer {
    flex: 1;
  }
  .run-x {
    font-size: 11px;
    color: var(--fg-3);
  }
  .timer-row {
    align-items: baseline;
    gap: 16px;
    margin-top: 12px;
  }
  .timer {
    font-size: 64px;
    line-height: 1;
    font-weight: 400;
    color: var(--fg-1);
    letter-spacing: -1.5px;
  }
  .timer.running {
    color: var(--accent);
  }
  .aux {
    display: flex;
    flex-direction: column;
    line-height: 1.4;
    gap: 2px;
  }
  .aux-line {
    font-size: 12px;
    color: var(--fg-1);
  }
  .aux-line.dim {
    color: var(--fg-2);
  }
  .muted {
    color: var(--fg-3);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .hint {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
    font-size: 10px;
    color: var(--fg-3);
    letter-spacing: 0.5px;
    position: relative;
  }
  .quick-pick {
    margin-top: 18px;
    position: relative;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .drop-input {
    all: unset;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: var(--bg-0);
    border: 1px solid var(--line);
    border-radius: 8px;
    margin-bottom: 14px;
    font-size: 12px;
    color: var(--fg-3);
    cursor: pointer;
    transition: border-color 120ms;
  }
  .drop-input:hover {
    border-color: var(--accent);
  }
  .drops {
    flex: 1;
    overflow: auto;
    margin-right: -6px;
    padding-right: 6px;
  }
  .empty {
    font-size: 11px;
    color: var(--fg-3);
    padding: 12px 4px;
  }
  .drop-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 4px;
    border-bottom: 1px solid var(--line-soft);
  }
  .run-tag {
    font-size: 10px;
    color: var(--fg-3);
    width: 38px;
    flex-shrink: 0;
  }
  .drop-item .text {
    font-size: 12px;
    color: var(--fg-1);
    flex: 1;
    font-weight: 500;
  }
  .ago {
    font-size: 11px;
    color: var(--fg-3);
  }
  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin-right: -6px;
    padding-right: 6px;
  }
  .run-row {
    display: grid;
    grid-template-columns: 28px 1fr 56px 36px;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
  }
  .run-row.current {
    background: var(--accent-glow);
    border-color: rgba(224, 181, 104, 0.25);
  }
  .idx {
    font-size: 11px;
    color: var(--fg-3);
  }
  .lbl {
    font-size: 12px;
    color: var(--fg-1);
  }
  .lbl.active {
    color: var(--accent);
  }
  .dur {
    font-size: 12px;
    color: var(--fg-1);
    text-align: right;
  }
  .drops {
    font-size: 11px;
    color: var(--fg-3);
    text-align: right;
  }
  .drops.has {
    color: var(--accent);
  }
  .meta {
    font-size: 10px;
    color: var(--fg-3);
  }
</style>
