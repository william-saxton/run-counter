<script lang="ts">
  import Icon from "./Icon.svelte";
  import Dot from "./Dot.svelte";
  import PauseGlyph from "./PauseGlyph.svelte";
  import { activeRun, completedRuns, now, session } from "../stores/session";
  import { elapsedMs } from "../stores/session";
  import { formatDuration, average } from "../timer";
  import { settings } from "../stores/settings";
  import { isTauri } from "../api";
  import { onMount } from "svelte";

  let hover = false;

  // Pre-resolve the window handle so startDragging() can fire *synchronously*
  // inside the mousedown handler — the OS only accepts a drag-start request
  // for a brief window after the click.
  type WinHandle = { startDragging: () => Promise<void> };
  let win: WinHandle | null = null;

  onMount(async () => {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      win = getCurrentWindow();
    } catch (err) {
      console.warn("could not load Tauri window API", err);
    }
  });

  function onMouseDown(e: MouseEvent) {
    if ($settings.overlay_lock) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;
    if (!win) return;
    // Fire synchronously — don't await — so the call enters the IPC pipe
    // before the browser dispatches its own mousedown handling.
    win.startDragging().catch((err) => console.warn("startDragging failed", err));
  }

  $: status = $activeRun?.status ?? "running";
  $: isRunning = status === "active";
  $: runNum = $session.session ? $session.session.runs.length : 0;
  $: runLabel = $activeRun?.label ?? "—";

  $: liveMs = $activeRun ? elapsedMs($activeRun, $now) : 0;
  $: time = formatDuration(liveMs);

  $: completedDurations = $completedRuns
    .filter((r) => r.ended_at)
    .map((r) => (r.ended_at as number) - r.started_at - r.paused_ms);
  $: avgMs = average(completedDurations);
  $: avg = completedDurations.length ? formatDuration(avgMs) : "—";
  $: progressPct =
    completedDurations.length && avgMs > 0 ? Math.min(100, (liveMs / avgMs) * 100) : 0;

  $: opacity = ($settings.overlay_opacity ?? 92) / 100;
  $: hotkeyHint = $settings.hotkeys.next_run + " next";
  $: locked = $settings.overlay_lock;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div
  class="overlay"
  class:locked
  on:mouseenter={() => (hover = true)}
  on:mouseleave={() => (hover = false)}
  on:mousedown={onMouseDown}
  role="presentation"
  style:--ovl-opacity={opacity}
  data-tauri-drag-region={!locked ? "true" : undefined}
>
  {#if hover && !locked}
    <div class="grip">
      <Icon name="drag" size={12} stroke="var(--fg-3)" />
    </div>
  {/if}

  <div class="row top">
    {#if isRunning}
      <Dot color="var(--accent)" size={7} />
    {:else}
      <PauseGlyph size={9} color="var(--fg-2)" />
    {/if}
    <span class="status">{isRunning ? "Running" : status === "paused" ? "Paused" : "Idle"}</span>
    <span class="spacer" />
    <span class="label">{runLabel}</span>
    <span class="sep">·</span>
    <span class="run-num">Run {runNum}</span>
  </div>

  <div class="row timer-row">
    <span class="num timer" class:running={isRunning}>{time}</span>
    <span class="spacer" />
    <div class="avg">
      <span class="avg-label">avg</span>
      <span class="num avg-val">{avg}</span>
    </div>
  </div>

  <div class="row bottom">
    <span class="meta">{completedDurations.length} runs</span>
    <div class="bar">
      <div class="fill" class:running={isRunning} style:width="{progressPct}%" />
    </div>
    <span class="meta mono">{hotkeyHint}</span>
  </div>
</div>

<style>
  .overlay {
    width: 100vw;
    height: 100vh;
    background: rgba(14, 15, 18, var(--ovl-opacity, 0.92));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 4px;
    position: relative;
    box-shadow:
      0 12px 28px -10px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(255, 255, 255, 0.02) inset;
    font-family: var(--font-ui);
    color: var(--fg-1);
    overflow: hidden;
    container-type: size;
  }
  .overlay:not(.locked) {
    cursor: grab;
  }
  .overlay:not(.locked):active {
    cursor: grabbing;
  }
  .grip {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--fg-3);
    padding: 2px;
    cursor: grab;
    display: flex;
    pointer-events: auto;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .timer-row {
    align-items: baseline;
    gap: 10px;
  }
  .bottom {
    gap: 6px;
  }
  .spacer {
    flex: 1;
  }
  .status {
    font-size: 11px;
    color: var(--fg-2);
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 500;
  }
  .label {
    font-size: 11px;
    color: var(--fg-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .sep {
    font-size: 11px;
    color: var(--fg-3);
    flex-shrink: 0;
  }
  .run-num {
    font-size: 11px;
    color: var(--fg-1);
    font-weight: 500;
    flex-shrink: 0;
  }
  .timer {
    font-size: clamp(22px, 9cqw, 38px);
    line-height: 1;
    color: var(--fg-2);
    font-weight: 500;
    letter-spacing: -0.5px;
  }
  .timer.running {
    color: var(--accent);
  }
  .avg {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.1;
    flex-shrink: 0;
  }
  .avg-label {
    font-size: 9px;
    color: var(--fg-3);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .avg-val {
    font-size: 13px;
    color: var(--fg-1);
  }
  .meta {
    font-size: 10px;
    color: var(--fg-3);
    flex-shrink: 0;
  }
  .meta.mono {
    font-family: var(--font-mono);
  }
  .bar {
    flex: 1;
    height: 2px;
    background: var(--bg-3);
    border-radius: 2px;
    overflow: hidden;
    min-width: 0;
  }
  .fill {
    height: 100%;
    background: var(--fg-3);
    opacity: 0.4;
    transition: width 200ms linear;
  }
  .fill.running {
    background: var(--accent);
    opacity: 0.7;
  }

  /* Hide bottom row when overlay is too short */
  @container (max-height: 78px) {
    .bottom {
      display: none;
    }
  }
  /* Hide status text when overlay is too narrow */
  @container (max-width: 260px) {
    .status {
      display: none;
    }
  }
</style>
