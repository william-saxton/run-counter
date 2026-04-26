import { writable } from "svelte/store";
import { DEFAULT_HOTKEYS, DEFAULT_LABELS, type Profile, type Settings } from "../types";

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
    saved_labels: [...DEFAULT_LABELS],
    overlay_opacity: 92,
    overlay_lock: true,
    overlay_always_on_top: true,
    resume_on_launch: true,
    auto_pause_on_focus_loss: false,
    game_process_name: "D2R.exe",
    profiles: [profile],
    active_profile_id: profile.id,
  };
})();

const STORAGE_KEY = "d2r-rc-settings";

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

_store.subscribe((s) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
});

export const settings = {
  subscribe: _store.subscribe,
  set: _store.set,
  update: _store.update,
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
