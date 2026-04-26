export type RunStatus = "active" | "paused" | "completed";

export interface Drop {
  id: number;
  run_id: number;
  text: string;
  logged_at: number;
}

export interface Run {
  id: number;
  session_id: number;
  label: string | null;
  started_at: number;
  ended_at: number | null;
  paused_ms: number;
  status: RunStatus;
  drops: Drop[];
}

export interface Session {
  id: number;
  started_at: number;
  ended_at: number | null;
  default_label: string | null;
  runs: Run[];
}

export interface HotkeyBindings {
  next_run: string;
  toggle_pause: string;
  log_drop: string;
  toggle_overlay: string;
}

export interface Profile {
  id: string;
  name: string;
  created_at: number;
}

export interface Settings {
  hotkeys: HotkeyBindings;
  saved_labels: string[];
  overlay_opacity: number;
  overlay_lock: boolean;
  overlay_always_on_top: boolean;
  resume_on_launch: boolean;
  auto_pause_on_focus_loss: boolean;
  /** Process name (case-insensitive) treated as "the game" for auto-pause. */
  game_process_name: string;
  profiles: Profile[];
  active_profile_id: string;
}

export const DEFAULT_HOTKEYS: HotkeyBindings = {
  next_run: "F9",
  toggle_pause: "F10",
  log_drop: "F11",
  toggle_overlay: "Ctrl+F12",
};

export const DEFAULT_LABELS = [
  "Mephisto",
  "Pindle",
  "Baal",
  "Andariel",
  "Diablo",
  "Cows",
  "Countess",
  "Trav",
];
