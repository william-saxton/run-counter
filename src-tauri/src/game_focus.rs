//! Polls the OS foreground window once per ~500ms and emits a `game:focus`
//! event whenever the focused process matches/stops matching the configured
//! game executable name. Empty string disables matching.
//!
//! Windows-only. Other platforms are stubbed to no-op.

use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone)]
pub struct FocusWatcherState {
    inner: Arc<Mutex<FocusInner>>,
}

struct FocusInner {
    /// Lower-cased process name(s) we treat as "the game". User can change.
    game_process: String,
    last_focused: Option<bool>,
}

impl FocusWatcherState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(FocusInner {
                game_process: String::new(),
                last_focused: None,
            })),
        }
    }

    pub fn set_process(&self, name: &str) {
        let mut s = self.inner.lock().unwrap();
        s.game_process = name.trim().to_lowercase();
        // Reset last_focused so the next tick re-emits with the new criterion.
        s.last_focused = None;
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
            let focused = foreground_process_name()
                .ok()
                .map(|n| n.eq_ignore_ascii_case(&process_name))
                .unwrap_or(false);

            let mut s = state.inner.lock().unwrap();
            if s.last_focused != Some(focused) {
                s.last_focused = Some(focused);
                drop(s);
                // Emit per-webview-window. Broadcasting via app.emit() doesn't
                // reach frontend listeners reliably in this Tauri 2 setup.
                for (_label, window) in app.webview_windows() {
                    let _ = window.emit("game:focus", focused);
                }
            }
        }
        std::thread::sleep(Duration::from_millis(500));
    });
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
