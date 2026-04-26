use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{Shortcut, ShortcutState};

mod game_focus;
mod hotkeys;

use game_focus::FocusWatcherState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyBindings {
    pub next_run: String,
    pub toggle_pause: String,
    pub log_drop: String,
    pub toggle_overlay: String,
}

impl Default for HotkeyBindings {
    fn default() -> Self {
        Self {
            next_run: "F9".into(),
            toggle_pause: "F10".into(),
            log_drop: "F11".into(),
            toggle_overlay: "Ctrl+F12".into(),
        }
    }
}

pub struct AppState {
    pub hotkeys: Mutex<HotkeyBindings>,
}

#[tauri::command]
fn get_hotkeys(state: State<'_, AppState>) -> HotkeyBindings {
    state.hotkeys.lock().unwrap().clone()
}

#[tauri::command]
fn set_hotkeys(
    app: AppHandle,
    state: State<'_, AppState>,
    bindings: HotkeyBindings,
) -> Result<(), String> {
    {
        let mut current = state.hotkeys.lock().unwrap();
        *current = bindings.clone();
    }
    hotkeys::reregister(&app, &bindings).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_game_process(state: State<'_, FocusWatcherState>, name: String) {
    state.set_process(&name);
}

#[tauri::command]
fn get_game_process(state: State<'_, FocusWatcherState>) -> String {
    state.current_process()
}

#[tauri::command]
fn toggle_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        let visible = win.is_visible().map_err(|e| e.to_string())?;
        if visible {
            win.hide().map_err(|e| e.to_string())?;
        } else {
            win.show().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        hotkeys: Mutex::new(HotkeyBindings::default()),
    };
    let focus_state = FocusWatcherState::new();

    tauri::Builder::default()
        .manage(app_state)
        .manage(focus_state.clone())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let state = app.state::<AppState>();
                    let bindings = state.hotkeys.lock().unwrap().clone();
                    if let Some(name) = match_event_name(shortcut, &bindings) {
                        // Emit per-webview-window. Broadcasting via app.emit()
                        // doesn't reach frontend listeners reliably in this
                        // Tauri 2 setup.
                        for (_label, window) in app.webview_windows() {
                            let _ = window.emit(name, ());
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_hotkeys,
            set_hotkeys,
            toggle_overlay,
            get_game_process,
            set_game_process,
        ])
        .on_window_event(|window, event| {
            // When the main window is closed, exit the whole app so the
            // overlay (and any other auxiliary windows) shut down too.
            if window.label() == "main" {
                if let tauri::WindowEvent::Destroyed = event {
                    window.app_handle().exit(0);
                }
            }
        })
        .setup(move |app| {
            let bindings = app
                .state::<AppState>()
                .hotkeys
                .lock()
                .unwrap()
                .clone();
            if let Err(e) = hotkeys::register_initial(&app.handle(), &bindings) {
                eprintln!("hotkey registration failed: {e}");
            }
            game_focus::start(app.handle().clone(), focus_state.clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn match_event_name(shortcut: &Shortcut, bindings: &HotkeyBindings) -> Option<&'static str> {
    let next = hotkeys::parse_chord(&bindings.next_run).ok()?;
    let pause = hotkeys::parse_chord(&bindings.toggle_pause).ok()?;
    let drop = hotkeys::parse_chord(&bindings.log_drop).ok()?;
    let ovl = hotkeys::parse_chord(&bindings.toggle_overlay).ok()?;

    if same_shortcut(shortcut, &next) {
        Some("hotkey:next_run")
    } else if same_shortcut(shortcut, &pause) {
        Some("hotkey:toggle_pause")
    } else if same_shortcut(shortcut, &drop) {
        Some("hotkey:log_drop")
    } else if same_shortcut(shortcut, &ovl) {
        Some("hotkey:toggle_overlay")
    } else {
        None
    }
}

fn same_shortcut(a: &Shortcut, b: &Shortcut) -> bool {
    a.id() == b.id()
}
