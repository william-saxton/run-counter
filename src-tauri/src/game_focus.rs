//! Polls the OS foreground window every ~250ms and emits a `game:focus`
//! event whenever the focused process matches/stops matching the configured
//! game executable name. Empty string disables matching.
//!
//! Refocus is reported immediately. Unfocus is debounced — we require several
//! consecutive observations before believing it, so transient blips
//! (notification toasts, tooltip popups, momentary NULL foreground during
//! window-manager handoffs) don't cause spurious auto-pause cycles.
//!
//! Windows-only. Other platforms are stubbed to no-op.

use std::sync::Arc;
use std::sync::Mutex;
#[cfg(windows)]
use std::time::Duration;
use tauri::AppHandle;
#[cfg(windows)]
use tauri::Emitter;

#[derive(Clone)]
pub struct FocusWatcherState {
    inner: Arc<Mutex<FocusInner>>,
}

struct FocusInner {
    /// Lower-cased process name(s) we treat as "the game". User can change.
    game_process: String,
    last_focused: Option<bool>,
    /// Consecutive observations of "not the game in foreground". The
    /// emitted state only flips to unfocused once this hits the debounce
    /// threshold. Reset by any "focused" or unreadable observation.
    unfocused_streak: u32,
}

/// Poll cadence and debounce. With 250ms polling and a 4-poll threshold,
/// the game must remain unfocused for ~750ms-1s before we report it. This
/// filters brief blips (taskbar/notification popovers, alt-tab handoffs)
/// while still feeling responsive when the user genuinely alt-tabs away.
#[cfg(windows)]
const POLL_INTERVAL: Duration = Duration::from_millis(250);
#[cfg(windows)]
const UNFOCUSED_DEBOUNCE_POLLS: u32 = 4;

impl FocusWatcherState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(FocusInner {
                game_process: String::new(),
                last_focused: None,
                unfocused_streak: 0,
            })),
        }
    }

    pub fn set_process(&self, name: &str) {
        let mut s = self.inner.lock().unwrap();
        s.game_process = name.trim().to_lowercase();
        // Reset all derived state so the next tick re-evaluates from scratch.
        s.last_focused = None;
        s.unfocused_streak = 0;
    }

    pub fn current_process(&self) -> String {
        self.inner.lock().unwrap().game_process.clone()
    }
}

#[cfg(windows)]
pub fn start(app: AppHandle, state: FocusWatcherState) {
    std::thread::spawn(move || loop {
        let process_name = state.inner.lock().unwrap().game_process.clone();
        // No process configured → don't emit focus events at all. Frontend
        // would otherwise see a permanent "unfocused" state once the user
        // enabled auto-pause, even though they hadn't picked a target.
        if !process_name.is_empty() {
            // Some(true) = game is foreground, Some(false) = something else
            // is foreground, None = couldn't read (transient NULL during
            // window-manager handoffs, lock screen, etc.). Treat None as
            // "no evidence either way" — preserve state and don't advance
            // the unfocused streak.
            let observed: Option<bool> = foreground_process_name()
                .ok()
                .map(|n| n.eq_ignore_ascii_case(&process_name));

            if let Some(is_focused) = observed {
                let mut s = state.inner.lock().unwrap();
                if is_focused {
                    s.unfocused_streak = 0;
                    if s.last_focused != Some(true) {
                        s.last_focused = Some(true);
                        drop(s);
                        emit_focus(&app, true);
                    }
                } else {
                    s.unfocused_streak = s.unfocused_streak.saturating_add(1);
                    if s.unfocused_streak >= UNFOCUSED_DEBOUNCE_POLLS
                        && s.last_focused != Some(false)
                    {
                        s.last_focused = Some(false);
                        drop(s);
                        emit_focus(&app, false);
                    }
                }
            }
        }
        std::thread::sleep(POLL_INTERVAL);
    });
}

#[cfg(windows)]
fn emit_focus(app: &AppHandle, focused: bool) {
    // Target the main window explicitly. WebviewWindow::emit broadcasts to
    // every window in Tauri 2, so the previous per-window loop fired each
    // frontend listener N times where N is the number of webview windows.
    let _ = app.emit_to("main", "game:focus", focused);
}

#[cfg(not(windows))]
pub fn start(_app: AppHandle, _state: FocusWatcherState) {
    // Foreground-window detection is only implemented for Windows.
}

#[cfg(windows)]
fn foreground_process_name() -> Result<String, ()> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return Err(());
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return Err(());
        }
        // PROCESS_QUERY_LIMITED_INFORMATION suffices for
        // QueryFullProcessImageNameW and works without admin for most
        // non-protected processes.
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return Err(());
        }
        let mut buf = [0u16; 1024];
        let mut size: u32 = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(handle);
        if ok == 0 || size == 0 {
            return Err(());
        }
        let full = String::from_utf16_lossy(&buf[..size as usize]);
        Ok(std::path::Path::new(&full)
            .file_name()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .unwrap_or(full))
    }
}
