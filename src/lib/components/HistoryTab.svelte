<script lang="ts">
  import Btn from "./Btn.svelte";
  import Chip from "./Chip.svelte";
  import Icon from "./Icon.svelte";
  import { session as sessionApi } from "../stores/session";
  import { session } from "../stores/session";
  import { persistence, listenEvent } from "../api";
  import { formatDuration } from "../timer";
  import type { Session } from "../types";
  import { onMount, onDestroy } from "svelte";

  export let onStart: () => void;

  let pastSessions: Session[] = [];
  let unsub: (() => void) | null = null;

  let search = "";
  let labelFilter: string | null = null;
  let dateFilter: "all" | "7d" | "30d" = "all";

  async function reload() {
    pastSessions = await persistence.loadHistory();
  }

  onMount(async () => {
    await reload();
    unsub = await listenEvent("session:updated", reload);
  });

  onDestroy(() => unsub?.());

  $: allSessions = $session.session ? [$session.session, ...pastSessions] : pastSessions;

  /** Distinct labels across all sessions, sorted by frequency. */
  $: labelOptions = (() => {
    const counts = new Map<string, number>();
    for (const s of allSessions) {
      for (const r of s.runs) {
        if (r.label) counts.set(r.label, (counts.get(r.label) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .slice(0, 8);
  })();

  // Inline the filter so Svelte tracks search / labelFilter / dateFilter as deps.
  $: sessions = allSessions.filter((s) => {
    if (dateFilter !== "all") {
      const days = dateFilter === "7d" ? 7 : 30;
      const cutoff = Date.now() - days * 86_400_000;
      if (s.started_at < cutoff) return false;
    }
    if (labelFilter && !s.runs.some((r) => r.label === labelFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const inLabel = s.runs.some((r) => (r.label ?? "").toLowerCase().includes(q));
      const inDrops = s.runs.some((r) =>
        r.drops.some((d) => d.text.toLowerCase().includes(q))
      );
      if (!inLabel && !inDrops) return false;
    }
    return true;
  });
  $: hasResults = sessions.length > 0;

  let expandedId: number | null = null;

  function toggle(id: number) {
    expandedId = expandedId === id ? null : id;
  }

  function pickLabel(l: string | null) {
    labelFilter = labelFilter === l ? null : l;
  }
  function pickDate(d: "all" | "7d" | "30d") {
    dateFilter = d;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function totalDur(s: Session): number {
    return (s.ended_at ?? Date.now()) - s.started_at;
  }
  function primaryLabel(s: Session): string {
    const counts: Record<string, number> = {};
    for (const r of s.runs) {
      const l = r.label ?? "—";
      counts[l] = (counts[l] ?? 0) + 1;
    }
    const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return top?.[0] ?? "—";
  }
</script>

{#if allSessions.length === 0}
  <div class="empty-wrap">
    <div class="empty-card">
      <div class="icon-box"><Icon name="list" size={20} stroke="var(--fg-3)" /></div>
      <div class="title">No sessions yet</div>
      <div class="body">
        Start a session from the Live tab. Every run you complete will be saved here, with
        timings and drops you log along the way.
      </div>
      <Btn kind="primary" icon="play" on:click={onStart}>Start a session</Btn>
    </div>
  </div>
{:else}
  <div class="root">
    <!-- Filters -->
    <div class="filters">
      <div class="search">
        <Icon name="search" size={12} stroke="var(--fg-3)" />
        <input
          type="text"
          bind:value={search}
          placeholder="Search sessions or drops…"
        />
      </div>
      <div class="filter-chips">
        <Chip active={labelFilter === null} on:click={() => (labelFilter = null)}>
          All labels
        </Chip>
        {#each labelOptions as l}
          <Chip active={labelFilter === l} on:click={() => pickLabel(l)}>{l}</Chip>
        {/each}
        <span class="divider" />
        <Chip active={dateFilter === "all"} on:click={() => pickDate("all")}>Any time</Chip>
        <Chip active={dateFilter === "7d"} on:click={() => pickDate("7d")}>Last 7 days</Chip>
        <Chip active={dateFilter === "30d"} on:click={() => pickDate("30d")}>Last 30 days</Chip>
      </div>
      <div class="spacer" />
      <Btn icon="download">Export CSV</Btn>
    </div>

    {#if !hasResults}
      <div class="no-match">No sessions match your filters.</div>
    {:else}
    <!-- Header row -->
    <div class="head-row">
      <span />
      <span>Date</span>
      <span>Time</span>
      <span>Primary label</span>
      <span class="r">Duration</span>
      <span class="r">Runs</span>
      <span />
    </div>

    <div class="scroll list">
      {#each sessions as s (s.id)}
        <div class="session-card" class:expanded={expandedId === s.id}>
          <button class="session-row" on:click={() => toggle(s.id)}>
            <span class="chev" class:open={expandedId === s.id}>
              <Icon name="chevron" size={11} stroke="var(--fg-3)" />
            </span>
            <span class="date">{formatDate(s.started_at)}</span>
            <span class="time">{formatTime(s.started_at)}</span>
            <div class="label-cell">
              <span class="lbl">{primaryLabel(s)}</span>
              {#if !s.ended_at}
                <span class="active-tag">Active</span>
              {/if}
            </div>
            <span class="num r dur">{formatDuration(totalDur(s))}</span>
            <span class="num r runs">{s.runs.length} runs</span>
            <span />
          </button>

          {#if expandedId === s.id}
            <div class="run-table">
              <div class="run-head">
                <span>Run</span>
                <span>Label</span>
                <span class="r">Time</span>
                <span>Drops</span>
                <span class="r">Started</span>
              </div>
              {#each s.runs as r, i}
                <div class="run-line">
                  <span class="num idx">#{i + 1}</span>
                  <span class="lbl">{r.label ?? "—"}</span>
                  <span class="num r dur">
                    {r.ended_at
                      ? formatDuration(r.ended_at - r.started_at - r.paused_ms)
                      : "—"}
                  </span>
                  <span class="drops" class:has={r.drops.length > 0}>
                    {r.drops.length ? r.drops.map((d) => d.text).join(", ") : "—"}
                  </span>
                  <span class="num r at">{formatTime(r.started_at)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {/if}
  </div>
{/if}

<style>
  .root {
    flex: 1;
    min-height: 0;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .filters {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--bg-2);
    border: 1px solid var(--line-soft);
    border-radius: 6px;
    flex: 1;
    max-width: 260px;
    font-size: 12px;
    color: var(--fg-3);
  }
  .search input {
    flex: 1;
    background: transparent;
    border: 0;
    outline: none;
    color: var(--fg);
    font-family: inherit;
    font-size: 12px;
    min-width: 0;
  }
  .search input::placeholder {
    color: var(--fg-3);
  }
  .filter-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .divider {
    width: 1px;
    height: 18px;
    background: var(--line);
    margin: 0 4px;
  }
  .no-match {
    padding: 24px 4px;
    color: var(--fg-3);
    font-size: 12px;
    text-align: center;
    border: 1px dashed var(--line-soft);
    border-radius: 8px;
  }
  .spacer {
    flex: 1;
  }
  .head-row,
  .session-row {
    display: grid;
    grid-template-columns: 20px 110px 80px 1fr 80px 70px 14px;
    gap: 14px;
    align-items: center;
  }
  .head-row {
    padding: 0 14px;
    font-size: 10px;
    color: var(--fg-3);
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .head-row .r,
  .session-row .r,
  .run-line .r {
    text-align: right;
  }
  .list {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .session-card {
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    overflow: hidden;
    transition: background 120ms;
  }
  .session-card.expanded {
    background: var(--bg-2);
  }
  .session-row {
    all: unset;
    cursor: pointer;
    padding: 12px 14px;
    width: 100%;
    box-sizing: border-box;
  }
  .session-row:hover {
    background: var(--bg-3);
  }
  .chev {
    display: inline-flex;
    transition: transform 160ms;
    color: var(--fg-3);
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .date {
    font-size: 12px;
    color: var(--fg-1);
  }
  .time {
    font-size: 11px;
    color: var(--fg-3);
  }
  .label-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .lbl {
    font-size: 12px;
    color: var(--fg-1);
  }
  .active-tag {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(224, 181, 104, 0.4);
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .dur {
    font-size: 12px;
    color: var(--fg-1);
  }
  .runs {
    font-size: 12px;
    color: var(--fg-2);
  }
  .run-table {
    border-top: 1px solid var(--line-soft);
    padding: 4px 14px 14px;
    background: var(--bg-1);
  }
  .run-head {
    display: grid;
    grid-template-columns: 40px 1fr 80px 1fr 80px;
    gap: 10px;
    padding: 10px 4px 6px;
    font-size: 10px;
    color: var(--fg-3);
    letter-spacing: 1.2px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--line-soft);
  }
  .run-line {
    display: grid;
    grid-template-columns: 40px 1fr 80px 1fr 80px;
    gap: 10px;
    padding: 8px 4px;
    align-items: center;
    border-bottom: 1px solid var(--line-soft);
  }
  .idx {
    font-size: 11px;
    color: var(--fg-3);
  }
  .run-line .lbl {
    font-size: 12px;
    color: var(--fg-1);
  }
  .run-line .dur {
    font-size: 12px;
    color: var(--fg-1);
  }
  .run-line .drops {
    font-size: 12px;
    color: var(--fg-3);
  }
  .run-line .drops.has {
    color: var(--accent);
  }
  .at {
    font-size: 11px;
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
    gap: 0;
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
    color: var(--fg-3);
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
