import { writable, derived, get } from "svelte/store";
import type { Run, Session } from "../types";
import { isTauri, persistence, listenEvent, emitEvent } from "../api";

interface State {
  session: Session | null;
  /** monotonic clock used for live duration calc */
  now: number;
}

const _state = writable<State>({ session: null, now: Date.now() });

let tickHandle: number | null = null;
let heartbeatCounter = 0;

function startTick() {
  if (tickHandle !== null) return;
  tickHandle = window.setInterval(() => {
    _state.update((s) => ({ ...s, now: Date.now() }));
    // Owner window broadcasts a 'tick' event 4x/s so the overlay stays in
    // sync even if its own setInterval is throttled by the OS.
    if (isOwner) {
      heartbeatCounter = (heartbeatCounter + 1) % 4;
      if (heartbeatCounter === 0) {
        emitEvent("session:tick", Date.now()).catch(() => {});
      }
    }
  }, 250);
}

function stopTick() {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

let nextRunId = 0;
let nextDropId = 0;

function reseedIds(s: Session) {
  for (const r of s.runs) {
    if (r.id > nextRunId) nextRunId = r.id;
    for (const d of r.drops) if (d.id > nextDropId) nextDropId = d.id;
  }
}

function makeRun(sessionId: number, label: string | null, startedAt = Date.now()): Run {
  return {
    id: ++nextRunId,
    session_id: sessionId,
    label,
    started_at: startedAt,
    ended_at: null,
    paused_ms: 0,
    status: "active",
    drops: [],
  };
}

let isOwner = true; // main window writes; overlay reads
let suppressBroadcast = false;
// True iff the active run's current paused state was set by the auto-pause
// system (focus watcher) rather than by an explicit user action. Reset by any
// user-initiated state change so a stale flag from a prior cycle can never
// cause the next refocus to silently resume a manually-paused run.
let lastPausedByAuto = false;

/** Persist active session and notify other windows. */
async function commit(): Promise<void> {
  const s = get(_state).session;
  if (!isOwner) return;
  await persistence.saveActive(s);
  if (!suppressBroadcast) await emitEvent("session:updated", s);
}

export const session = {
  subscribe: _state.subscribe,

  /** Mark this store instance as a read-only mirror (overlay window). */
  setReadOnly() {
    isOwner = false;
  },

  async startSession(defaultLabel: string | null = null) {
    const startedAt = Date.now();
    const sid = startedAt;
    nextRunId = 0;
    nextDropId = 0;
    lastPausedByAuto = false;
    const sess: Session = {
      id: sid,
      started_at: startedAt,
      ended_at: null,
      default_label: defaultLabel,
      runs: [makeRun(sid, defaultLabel, startedAt)],
    };
    _state.set({ session: sess, now: Date.now() });
    startTick();
    await commit();
  },

  async endSession() {
    const endAt = Date.now();
    let toArchive: Session | null = null;
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.map((r, i, arr) => {
        if (i !== arr.length - 1) return r;
        if (r.status === "completed") return r;
        const pausedAdd = r.status === "paused" ? endAt - (r.ended_at ?? endAt) : 0;
        return {
          ...r,
          status: "completed" as const,
          ended_at: endAt,
          paused_ms: r.paused_ms + Math.max(0, pausedAdd),
        };
      });
      const ended = { ...s.session, ended_at: endAt, runs };
      toArchive = ended;
      return { ...s, session: ended };
    });
    stopTick();
    if (toArchive) {
      await persistence.appendHistory(toArchive);
    }
    _state.update((s) => ({ ...s, session: null }));
    await commit();
  },

  async nextRun(label?: string | null) {
    const t = Date.now();
    lastPausedByAuto = false;
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.map((r, i, arr) => {
        if (i !== arr.length - 1) return r;
        const pausedAdd = r.status === "paused" ? t - (r.ended_at ?? t) : 0;
        return {
          ...r,
          status: "completed" as const,
          ended_at: t,
          paused_ms: r.paused_ms + Math.max(0, pausedAdd),
        };
      });
      const useLabel = label !== undefined ? label : s.session.default_label;
      runs.push(makeRun(s.session.id, useLabel, t));
      return { ...s, session: { ...s.session, runs } };
    });
    await commit();
  },

  /** Reset the current run's elapsed time to zero. Keeps label and drops. */
  async resetCurrentRun() {
    const t = Date.now();
    lastPausedByAuto = false;
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.slice();
      const last = runs[runs.length - 1];
      if (!last || last.status === "completed") return s;
      runs[runs.length - 1] = {
        ...last,
        started_at: t,
        ended_at: null,
        paused_ms: 0,
        status: "active",
      };
      return { ...s, session: { ...s.session, runs } };
    });
    await commit();
  },

  async togglePause() {
    const t = Date.now();
    // Any user-initiated toggle takes ownership of the pause state, so a
    // later refocus event won't unexpectedly auto-resume what the user paused
    // (or auto-pause what the user just resumed).
    lastPausedByAuto = false;
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.slice();
      const last = runs[runs.length - 1];
      if (!last || last.status === "completed") return s;
      if (last.status === "active") {
        runs[runs.length - 1] = { ...last, status: "paused", ended_at: t };
      } else {
        const pausedFor = t - (last.ended_at ?? t);
        runs[runs.length - 1] = {
          ...last,
          status: "active",
          ended_at: null,
          paused_ms: last.paused_ms + Math.max(0, pausedFor),
        };
      }
      return { ...s, session: { ...s.session, runs } };
    });
    await commit();
  },

  /** Pause the active run if it's running. Marks the pause as auto-owned so
   *  autoResume() can later undo it. No-op if the run is already paused or
   *  completed — never re-pauses a manually-paused run. */
  async autoPause() {
    const t = Date.now();
    let didPause = false;
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.slice();
      const last = runs[runs.length - 1];
      if (!last || last.status !== "active") return s;
      runs[runs.length - 1] = { ...last, status: "paused", ended_at: t };
      didPause = true;
      return { ...s, session: { ...s.session, runs } };
    });
    if (didPause) {
      lastPausedByAuto = true;
      await commit();
    }
  },

  /** Resume the active run only if it was paused by the auto-pause system.
   *  Manually-paused runs are left alone. */
  async autoResume() {
    if (!lastPausedByAuto) return;
    const t = Date.now();
    let didResume = false;
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.slice();
      const last = runs[runs.length - 1];
      if (!last || last.status !== "paused") return s;
      const pausedFor = t - (last.ended_at ?? t);
      runs[runs.length - 1] = {
        ...last,
        status: "active",
        ended_at: null,
        paused_ms: last.paused_ms + Math.max(0, pausedFor),
      };
      didResume = true;
      return { ...s, session: { ...s.session, runs } };
    });
    lastPausedByAuto = false;
    if (didResume) await commit();
  },

  async setActiveLabel(label: string) {
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.slice();
      const last = runs[runs.length - 1];
      if (!last) return s;
      runs[runs.length - 1] = { ...last, label };
      return { ...s, session: { ...s.session, default_label: label, runs } };
    });
    await commit();
  },

  async logDrop(text: string) {
    const t = Date.now();
    _state.update((s) => {
      if (!s.session) return s;
      const runs = s.session.runs.slice();
      const last = runs[runs.length - 1];
      if (!last) return s;
      const drop = { id: ++nextDropId, run_id: last.id, text, logged_at: t };
      runs[runs.length - 1] = { ...last, drops: [...last.drops, drop] };
      return { ...s, session: { ...s.session, runs } };
    });
    await commit();
  },

  async restoreLast(): Promise<boolean> {
    const stored = await persistence.loadActive();
    if (!stored) return false;
    reseedIds(stored);
    _state.set({ session: stored, now: Date.now() });
    if (stored.runs.some((r) => r.status === "active" || r.status === "paused")) {
      startTick();
    }
    return true;
  },

  /** Replace local state from a remote snapshot (used by overlay window). */
  applyRemote(snapshot: Session | null) {
    suppressBroadcast = true;
    _state.set({ session: snapshot, now: Date.now() });
    suppressBroadcast = false;
    if (snapshot && snapshot.runs.some((r) => r.status === "active")) {
      startTick();
    } else {
      stopTick();
    }
  },

  /** Subscribe to cross-window updates (overlay calls this). */
  async subscribeRemote(): Promise<() => void> {
    return listenEvent<Session | null>("session:updated", (snap) => this.applyRemote(snap));
  },

  /** Subscribe to wall-clock ticks broadcast by the owner window.
   *  Lets the overlay update its display even when its own setInterval
   *  is throttled by the OS while the game is fullscreen. */
  async subscribeTicks(): Promise<() => void> {
    return listenEvent<number>("session:tick", (ts) => {
      _state.update((s) => ({ ...s, now: typeof ts === "number" ? ts : Date.now() }));
    });
  },

  /** Browser-only demo seed. */
  seedDemo() {
    const sid = Date.now() - 36 * 60 * 1000;
    nextRunId = 0;
    nextDropId = 0;
    const runs: Run[] = [];
    let t = sid;
    const dropPool = ["Sample drop A", "Sample drop B", "Sample drop C"];
    const demoLabel = "Run";
    for (let i = 1; i <= 22; i++) {
      const dur = 75_000 + Math.floor(Math.random() * 60_000);
      const r: Run = {
        id: ++nextRunId,
        session_id: sid,
        label: demoLabel,
        started_at: t,
        ended_at: t + dur,
        paused_ms: 0,
        status: "completed",
        drops: [],
      };
      if ([6, 11, 14, 19, 21, 22].includes(i)) {
        r.drops.push({
          id: ++nextDropId,
          run_id: r.id,
          text: dropPool[i % dropPool.length],
          logged_at: t + dur - 5000,
        });
      }
      runs.push(r);
      t += dur + 2_000;
    }
    runs.push(makeRun(sid, demoLabel, t));
    _state.set({
      session: {
        id: sid,
        started_at: sid,
        ended_at: null,
        default_label: demoLabel,
        runs,
      },
      now: Date.now(),
    });
    startTick();
  },
};

/** Compute live elapsed ms for a run. */
export function elapsedMs(run: Run, now: number): number {
  if (run.status === "completed" && run.ended_at) {
    return run.ended_at - run.started_at - run.paused_ms;
  }
  if (run.status === "paused" && run.ended_at) {
    return run.ended_at - run.started_at - run.paused_ms;
  }
  return now - run.started_at - run.paused_ms;
}

export const activeRun = derived(_state, ($s) => {
  if (!$s.session) return null;
  return $s.session.runs[$s.session.runs.length - 1] ?? null;
});

export const completedRuns = derived(_state, ($s) => {
  if (!$s.session) return [];
  return $s.session.runs.filter((r) => r.status === "completed");
});

export const sessionElapsedMs = derived(_state, ($s) => {
  if (!$s.session) return 0;
  const end = $s.session.ended_at ?? $s.now;
  return end - $s.session.started_at;
});

export const now = derived(_state, ($s) => $s.now);
