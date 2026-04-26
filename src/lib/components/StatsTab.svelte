<script lang="ts">
  import Btn from "./Btn.svelte";
  import Card from "./Card.svelte";
  import Icon from "./Icon.svelte";
  import SectionLabel from "./SectionLabel.svelte";
  import { session } from "../stores/session";
  import { persistence, listenEvent } from "../api";
  import { formatDuration, average, fastest, slowest } from "../timer";
  import type { Run, Session } from "../types";
  import { onMount, onDestroy } from "svelte";

  export let onStart: () => void;

  type Scope = { kind: "current" } | { kind: "all" } | { kind: "session"; id: number };
  let scope: Scope = { kind: "current" };
  let userPickedScope = false;

  let pastSessions: Session[] = [];
  let unsub: (() => void) | null = null;

  async function reload() {
    pastSessions = await persistence.loadHistory();
  }

  onMount(async () => {
    await reload();
    unsub = await listenEvent("session:updated", reload);
  });
  onDestroy(() => unsub?.());

  // Auto-pick a sensible default scope: prefer current session if active,
  // otherwise fall back to All time so past sessions are visible.
  $: if (!userPickedScope) {
    if ($session.session) {
      scope = { kind: "current" };
    } else if (pastSessions.length > 0) {
      scope = { kind: "all" };
    } else {
      scope = { kind: "current" };
    }
  }

  /** Resolve which sessions to aggregate based on scope. */
  $: scopedRuns = (() => {
    const current = $session.session?.runs ?? [];
    if (scope.kind === "current") return current;
    if (scope.kind === "all") {
      const past = pastSessions.flatMap((s) => s.runs);
      return [...current, ...past];
    }
    const sid = scope.id;
    const match = pastSessions.find((s) => s.id === sid);
    return match?.runs ?? [];
  })();

  $: scopedSession = (() => {
    if (scope.kind === "current") return $session.session ?? null;
    if (scope.kind === "all") return null;
    const sid = scope.id;
    return pastSessions.find((s) => s.id === sid) ?? null;
  })();

  $: completedRunsScoped = scopedRuns.filter((r): r is Run => r.status === "completed");
  $: completedDur = completedRunsScoped
    .filter((r) => r.ended_at)
    .map((r) => (r.ended_at as number) - r.started_at - r.paused_ms);

  $: byLabel = (() => {
    const map = new Map<string, number[]>();
    for (const r of completedRunsScoped) {
      if (!r.ended_at) continue;
      const dur = r.ended_at - r.started_at - r.paused_ms;
      const k = r.label ?? "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(dur);
    }
    const arr = Array.from(map.entries()).map(([label, durs]) => ({
      label,
      runs: durs.length,
      avg: average(durs),
    }));
    arr.sort((a, b) => b.runs - a.runs);
    return arr;
  })();

  function fmtDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  $: sessionOptions = pastSessions.map((s) => ({
    id: s.id,
    label: `${fmtDate(s.started_at)} · ${s.runs.length} runs`,
  }));

  function pickScope(s: Scope) {
    userPickedScope = true;
    scope = s;
  }

  function onSelectChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const v = target.value;
    if (!v) return;
    if (v === "current" || v === "all") {
      pickScope({ kind: v });
    } else {
      pickScope({ kind: "session", id: Number(v) });
    }
  }

  $: maxBarRuns = byLabel.length ? Math.max(...byLabel.map((b) => b.runs)) : 1;

  $: distribution = (() => {
    // 12 buckets, 0:30 → 3:00+
    const buckets = new Array(12).fill(0);
    const minSec = 30;
    const maxSec = 180;
    const step = (maxSec - minSec) / 11;
    for (const ms of completedDur) {
      const sec = ms / 1000;
      let idx = Math.floor((sec - minSec) / step);
      if (idx < 0) idx = 0;
      if (idx >= 12) idx = 11;
      buckets[idx]++;
    }
    return buckets;
  })();
  $: distMax = Math.max(1, ...distribution);
  $: distHighlight = distMax > 0 ? distribution.indexOf(distMax) : -1;

  $: scopeSubtitle = (() => {
    if (scope.kind === "current") {
      if (!$session.session) return "No active session";
      const started = new Date($session.session.started_at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `Session started ${started}`;
    }
    if (scope.kind === "all") {
      const total = pastSessions.length + ($session.session ? 1 : 0);
      return `${total} session${total === 1 ? "" : "s"}`;
    }
    if (scopedSession) {
      return new Date(scopedSession.started_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return "";
  })();

  function pct(n: number): number {
    if (!n) return 0;
    return Math.round((n / maxBarRuns) * 100);
  }

  $: hasData = completedDur.length > 0;
  $: anyDataAnywhere =
    ($session.session?.runs.some((r) => r.status === "completed") ?? false) ||
    pastSessions.some((s) => s.runs.some((r) => r.status === "completed"));
</script>

{#if !anyDataAnywhere}
  <div class="empty-wrap">
    <div class="empty-card">
      <div class="icon-box"><Icon name="chart" size={20} stroke="var(--fg-3)" /></div>
      <div class="title">Nothing to crunch yet</div>
      <div class="body">
        Once you've finished a few runs, you'll see averages, fastest times, and a per-target
        breakdown here.
      </div>
      <Btn kind="primary" icon="play" on:click={onStart}>Start a session</Btn>
    </div>
  </div>
{:else}
  <div class="root scroll">
    <div class="scope-bar">
      <div class="toggle">
        <button
          class:active={scope.kind === "current"}
          on:click={() => pickScope({ kind: "current" })}
          disabled={!$session.session}
        >
          Current
        </button>
        <button class:active={scope.kind === "all"} on:click={() => pickScope({ kind: "all" })}>
          All time
        </button>
      </div>
      <select
        class="session-select"
        on:change={onSelectChange}
        value={scope.kind === "session" ? String(scope.id) : ""}
      >
        <option value="" disabled>Pick a past session…</option>
        {#each sessionOptions as opt}
          <option value={String(opt.id)}>{opt.label}</option>
        {/each}
      </select>
      <div class="spacer" />
      <span class="scope-meta">{scopeSubtitle} · {completedRunsScoped.length} runs</span>
    </div>

    <div class="cards">
      <div class="stat-card">
        <span class="lbl">Total runs</span>
        <span class="num val">{completedRunsScoped.length}</span>
        <span class="sub">
          {scope.kind === "current"
            ? "in this session"
            : scope.kind === "all"
            ? "across all sessions"
            : "in selected session"}
        </span>
      </div>
      <div class="stat-card">
        <span class="lbl">Total time</span>
        <span class="num val">{formatDuration(completedDur.reduce((a, b) => a + b, 0))}</span>
        <span class="sub">play time</span>
      </div>
      <div class="stat-card accent">
        <span class="lbl">Average</span>
        <span class="num val">{formatDuration(average(completedDur))}</span>
        <span class="sub">per run</span>
      </div>
      <div class="stat-card">
        <span class="lbl">Fastest</span>
        <span class="num val">{formatDuration(fastest(completedDur))}</span>
        <span class="sub">best run</span>
      </div>
      <div class="stat-card">
        <span class="lbl">Slowest</span>
        <span class="num val">{formatDuration(slowest(completedDur))}</span>
        <span class="sub">worst run</span>
      </div>
    </div>

    <Card padding={18}>
      <SectionLabel>
        By target
        <span slot="right" class="meta">average time</span>
      </SectionLabel>
      {#each byLabel as b, i}
        <div class="bar-row">
          <span class="bar-label">{b.label}</span>
          <div class="track">
            <div
              class="fill"
              class:gold={i === 0}
              style:width="{pct(b.runs)}%"
            />
          </div>
          <span class="num bar-runs">{b.runs} runs</span>
          <span class="num bar-avg">{formatDuration(b.avg)}</span>
        </div>
      {/each}
    </Card>

    <Card padding={18}>
      <SectionLabel>Run-time distribution</SectionLabel>
      <div class="dist">
        {#each distribution as v, i}
          <div
            class="dist-bar"
            class:hot={i === distHighlight}
            style:height="{(v / distMax) * 100}%"
          >
            {#if i === distHighlight && v > 0}
              <span class="num dist-val">{v}</span>
            {/if}
          </div>
        {/each}
      </div>
      <div class="dist-axis">
        <span>0:30</span><span>1:00</span><span>1:30</span><span>2:00</span><span>2:30</span
        ><span>3:00+</span>
      </div>
    </Card>
  </div>
{/if}

<style>
  .root {
    flex: 1;
    min-height: 0;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: auto;
  }
  .scope-bar {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .toggle {
    display: inline-flex;
    padding: 3px;
    background: var(--bg-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
  }
  .toggle button {
    all: unset;
    cursor: pointer;
    padding: 5px 12px;
    font-size: 12px;
    color: var(--fg-2);
    background: transparent;
    border-radius: 5px;
    font-weight: 400;
  }
  .toggle button.active {
    color: var(--fg);
    background: var(--bg-3);
    font-weight: 500;
  }
  .toggle button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .session-select {
    appearance: none;
    -webkit-appearance: none;
    background: var(--bg-2);
    border: 1px solid var(--line-soft);
    border-radius: 6px;
    color: var(--fg-1);
    font-size: 12px;
    font-family: inherit;
    padding: 6px 26px 6px 10px;
    cursor: pointer;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--fg-3) 50%),
      linear-gradient(135deg, var(--fg-3) 50%, transparent 50%);
    background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
    background-size: 5px 5px, 5px 5px;
    background-repeat: no-repeat;
  }
  .session-select:hover {
    border-color: var(--line-strong);
  }
  .spacer {
    flex: 1;
  }
  .scope-meta {
    font-size: 11px;
    color: var(--fg-3);
  }
  .cards {
    display: flex;
    gap: 12px;
  }
  .stat-card {
    flex: 1;
    background: var(--bg-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-card .lbl {
    font-size: 10px;
    color: var(--fg-3);
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }
  .stat-card .val {
    font-size: 22px;
    color: var(--fg);
    font-weight: 400;
    letter-spacing: -0.5px;
  }
  .stat-card.accent .val {
    color: var(--accent);
  }
  .stat-card .sub {
    font-size: 11px;
    color: var(--fg-3);
  }
  .bar-row {
    display: grid;
    grid-template-columns: 90px 1fr 60px 60px;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .bar-label {
    font-size: 12px;
    color: var(--fg-1);
  }
  .track {
    height: 8px;
    background: var(--bg-0);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--line-soft);
  }
  .fill {
    height: 100%;
    background: var(--fg-2);
    border-radius: 4px;
    transition: width 200ms;
  }
  .fill.gold {
    background: var(--accent);
    box-shadow: 0 0 12px rgba(224, 181, 104, 0.3);
  }
  .bar-runs {
    font-size: 11px;
    color: var(--fg-2);
    text-align: right;
  }
  .bar-avg {
    font-size: 12px;
    color: var(--fg-1);
    text-align: right;
  }
  .dist {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 80px;
  }
  .dist-bar {
    flex: 1;
    background: var(--bg-3);
    border-radius: 2px 2px 0 0;
    position: relative;
    min-height: 2px;
  }
  .dist-bar.hot {
    background: var(--accent);
    opacity: 0.85;
  }
  .dist-val {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: var(--accent);
  }
  .dist-axis {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--line-soft);
    font-size: 10px;
    color: var(--fg-3);
    font-family: var(--font-mono);
  }
  .meta {
    font-size: 10px;
    color: var(--fg-3);
  }

  /* Empty state */
  .empty-wrap {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 40px;
  }
  .empty-card {
    text-align: center;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .icon-box {
    width: 48px;
    height: 48px;
    margin: 0 auto 18px;
    border-radius: 12px;
    border: 1px solid var(--line);
    display: grid;
    place-items: center;
    background: var(--bg-2);
  }
  .empty-card .title {
    font-size: 15px;
    color: var(--fg);
    font-weight: 500;
    margin-bottom: 6px;
  }
  .empty-card .body {
    font-size: 12px;
    color: var(--fg-2);
    line-height: 1.6;
    margin-bottom: 18px;
  }
</style>
