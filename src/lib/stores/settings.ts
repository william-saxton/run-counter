import { writable } from "svelte/store";
import { DEFAULT_HOTKEYS, type Profile, type Settings } from "../types";
import { emitEvent, isTauri, listenEvent } from "../api";

function defaultProfile(): Profile {
  return {
    id: crypto.randomUUID(),
    name: "Default",
    created_at: Date.now(),
  };
}

const initial: Settings = (() => {
  const profile = defaultProfile();
  return {
    hotkeys: { ...DEFAULT_HOTKEYS },
    saved_labels: [],
    overlay_opacity: 92,
    overlay_lock: true,
    overlay_always_on_top: true,
    resume_on_launch: true,
    auto_pause_on_focus_loss: false,
    game_process_name: "",
    profiles: [profile],
    active_profile_id: profile.id,
  };
})();

const STORAGE_KEY = "run-counter-settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = { ...initial, ...parsed };

    // Backfill profiles for older saves that pre-date this feature.
    if (!merged.profiles || merged.profiles.length === 0) {
      const p = defaultProfile();
      merged.profiles = [p];
      merged.active_profile_id = p.id;
    } else if (!merged.profiles.some((p) => p.id === merged.active_profile_id)) {
      merged.active_profile_id = merged.profiles[0].id;
    }
    return merged;
  } catch {
    return initial;
  }
}

const _store = writable<Settings>(load());

// Owner = the window that mutates settings (the main window). Other windows
// (the overlay) call setReadOnly() so they don't write to disk or re-broadcast
// the snapshots they receive.
let isOwner = true;
let suppress = false;
// Skip the first subscribe invocation: Svelte fires it synchronously at
// registration with the loaded value, but at that point the overlay window
// hasn't had a chance to call setReadOnly() yet — so it would broadcast its
// stale loaded state and clobber the main window's fresh settings.
let initialized = false;

_store.subscribe((s) => {
  if (!initialized) {
    initialized = true;
    return;
  }
  if (suppress) return;
  if (!isOwner) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
  if (isTauri()) {
    emitEvent("settings:updated", s).catch(() => {});
  }
});

export const settings = {
  subscribe: _store.subscribe,
  set: _store.set,
  update: _store.update,

  /** Mark this store instance as a read-only mirror (overlay window). */
  setReadOnly() {
    isOwner = false;
  },

  /** Apply a remote snapshot without re-broadcasting it. */
  applyRemote(snapshot: Settings) {
    suppress = true;
    _store.set(snapshot);
    suppress = false;
  },

  /** Subscribe to cross-window settings updates (overlay calls this). */
  async subscribeRemote(): Promise<() => void> {
    return listenEvent<Settings>("settings:updated", (s) => {
      if (s) this.applyRemote(s);
    });
  },
};

/* ---------- Profile helpers ---------- */

export function addProfile(name: string): Profile {
  const p: Profile = { id: crypto.randomUUID(), name, created_at: Date.now() };
  _store.update((s) => ({ ...s, profiles: [...s.profiles, p] }));
  return p;
}

export function removeProfile(id: string): void {
  _store.update((s) => {
    if (s.profiles.length <= 1) return s; // keep at least one
    const profiles = s.profiles.filter((p) => p.id !== id);
    const active_profile_id =
      s.active_profile_id === id ? profiles[0].id : s.active_profile_id;
    return { ...s, profiles, active_profile_id };
  });
}

export function renameProfile(id: string, name: string): void {
  _store.update((s) => ({
    ...s,
    profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)),
  }));
}

export function setActiveProfile(id: string): void {
  _store.update((s) =>
    s.profiles.some((p) => p.id === id) ? { ...s, active_profile_id: id } : s
  );
}
