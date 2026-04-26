/**
 * Thin abstraction over Tauri runtime so components stay environment-agnostic.
 * In the browser (vite dev with no Tauri), every method is a no-op or
 * falls back to localStorage.
 */
import type { HotkeyBindings, Session } from "./types";

export const isTauri = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  // Tauri 1 used `__TAURI__`; Tauri 2 renamed it to `__TAURI_INTERNALS__`.
  // Also accept the public `isTauri` boolean some setups expose.
  return !!(w.__TAURI__ || w.__TAURI_INTERNALS__ || w.isTauri);
};

type DropEvent =
  | "hotkey:next_run"
  | "hotkey:toggle_pause"
  | "hotkey:log_drop"
  | "hotkey:toggle_overlay"
  | "session:updated"
  | "session:tick"
  | "settings:updated"
  | "game:focus";

export async function listenEvent<T = unknown>(
  event: DropEvent,
  fn: (payload: T) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<T>(event, (e) => fn(e.payload));
  } catch (err) {
    console.error(`failed to listen on ${event}:`, err);
    return () => {};
  }
}

export async function emitEvent(event: DropEvent, payload?: unknown): Promise<void> {
  if (!isTauri()) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit(event, payload);
}

export async function getHotkeys(): Promise<HotkeyBindings | null> {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<HotkeyBindings>("get_hotkeys");
}

export async function setHotkeys(bindings: HotkeyBindings): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_hotkeys", { bindings });
}

export async function toggleOverlayWindow(): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("toggle_overlay");
}

export async function setGameProcess(name: string): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_game_process", { name });
}

/* ---------- Persistence (Tauri store plugin) ---------- */

let storePromise: Promise<any> | null = null;

async function store(): Promise<any> {
  if (!isTauri()) throw new Error("store not available");
  if (!storePromise) {
    const mod = await import("@tauri-apps/plugin-store");
    storePromise = mod.load("run-counter.json", { autoSave: true, defaults: {} });
  }
  return storePromise;
}

/** Currently-active profile id. The session store sets this when settings load. */
let activeProfileId: string = "default";

export function setActiveProfileId(id: string): void {
  activeProfileId = id;
}

const activeKey = (pid = activeProfileId) => `profile:${pid}:active`;
const historyKey = (pid = activeProfileId) => `profile:${pid}:history`;

export const persistence = {
  async loadActive(profileId: string = activeProfileId): Promise<Session | null> {
    if (!isTauri()) {
      try {
        const raw = localStorage.getItem(activeKey(profileId));
        return raw ? (JSON.parse(raw) as Session) : null;
      } catch {
        return null;
      }
    }
    const s = await store();
    return ((await s.get(activeKey(profileId))) ?? null) as Session | null;
  },

  async saveActive(
    session: Session | null,
    profileId: string = activeProfileId
  ): Promise<void> {
    if (!isTauri()) {
      if (session) localStorage.setItem(activeKey(profileId), JSON.stringify(session));
      else localStorage.removeItem(activeKey(profileId));
      return;
    }
    const s = await store();
    if (session) await s.set(activeKey(profileId), session);
    else await s.delete(activeKey(profileId));
  },

  async loadHistory(profileId: string = activeProfileId): Promise<Session[]> {
    if (!isTauri()) {
      try {
        const raw = localStorage.getItem(historyKey(profileId));
        return raw ? (JSON.parse(raw) as Session[]) : [];
      } catch {
        return [];
      }
    }
    const s = await store();
    return ((await s.get(historyKey(profileId))) ?? []) as Session[];
  },

  async saveHistory(
    history: Session[],
    profileId: string = activeProfileId
  ): Promise<void> {
    if (!isTauri()) {
      if (history.length > 0) {
        localStorage.setItem(historyKey(profileId), JSON.stringify(history));
      } else {
        localStorage.removeItem(historyKey(profileId));
      }
      return;
    }
    const s = await store();
    if (history.length > 0) await s.set(historyKey(profileId), history);
    else await s.delete(historyKey(profileId));
  },

  async appendHistory(session: Session): Promise<void> {
    const list = await this.loadHistory();
    list.unshift(session);
    await this.saveHistory(list);
  },

  /** Clear all data for the active profile. */
  async clearProfile(profileId: string = activeProfileId): Promise<void> {
    if (!isTauri()) {
      localStorage.removeItem(activeKey(profileId));
      localStorage.removeItem(historyKey(profileId));
      return;
    }
    const s = await store();
    await s.delete(activeKey(profileId));
    await s.delete(historyKey(profileId));
  },

  async clearAll(): Promise<void> {
    if (!isTauri()) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("profile:"))
        .forEach((k) => localStorage.removeItem(k));
      return;
    }
    const s = await store();
    await s.clear();
  },
};
