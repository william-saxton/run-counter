use crate::HotkeyBindings;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

pub fn parse_chord(chord: &str) -> Result<Shortcut, String> {
    let mut mods = Modifiers::empty();
    let mut key: Option<Code> = None;
    for raw in chord.split('+') {
        let part = raw.trim();
        if part.is_empty() {
            continue;
        }
        match part.to_ascii_lowercase().as_str() {
            "ctrl" | "control" | "cmd" | "command" | "commandorcontrol" => {
                mods |= Modifiers::CONTROL
            }
            "shift" => mods |= Modifiers::SHIFT,
            "alt" | "option" => mods |= Modifiers::ALT,
            "meta" | "win" | "super" => mods |= Modifiers::SUPER,
            other => {
                key = Some(string_to_code(other).ok_or_else(|| format!("unknown key: {part}"))?)
            }
        }
    }
    let code = key.ok_or_else(|| format!("no key in chord '{chord}'"))?;
    Ok(Shortcut::new(Some(mods), code))
}

fn string_to_code(s: &str) -> Option<Code> {
    let s = s.to_ascii_lowercase();
    Some(match s.as_str() {
        "f1" => Code::F1,
        "f2" => Code::F2,
        "f3" => Code::F3,
        "f4" => Code::F4,
        "f5" => Code::F5,
        "f6" => Code::F6,
        "f7" => Code::F7,
        "f8" => Code::F8,
        "f9" => Code::F9,
        "f10" => Code::F10,
        "f11" => Code::F11,
        "f12" => Code::F12,
        "f13" => Code::F13,
        "f14" => Code::F14,
        "f15" => Code::F15,
        "space" | " " => Code::Space,
        "enter" | "return" => Code::Enter,
        "tab" => Code::Tab,
        "escape" | "esc" => Code::Escape,
        "backspace" => Code::Backspace,
        "delete" | "del" => Code::Delete,
        "insert" => Code::Insert,
        "home" => Code::Home,
        "end" => Code::End,
        "pageup" => Code::PageUp,
        "pagedown" => Code::PageDown,
        "left" | "arrowleft" => Code::ArrowLeft,
        "right" | "arrowright" => Code::ArrowRight,
        "up" | "arrowup" => Code::ArrowUp,
        "down" | "arrowdown" => Code::ArrowDown,
        c if c.len() == 1 => {
            let ch = c.chars().next().unwrap();
            if ch.is_ascii_alphabetic() {
                match ch.to_ascii_lowercase() {
                    'a' => Code::KeyA,
                    'b' => Code::KeyB,
                    'c' => Code::KeyC,
                    'd' => Code::KeyD,
                    'e' => Code::KeyE,
                    'f' => Code::KeyF,
                    'g' => Code::KeyG,
                    'h' => Code::KeyH,
                    'i' => Code::KeyI,
                    'j' => Code::KeyJ,
                    'k' => Code::KeyK,
                    'l' => Code::KeyL,
                    'm' => Code::KeyM,
                    'n' => Code::KeyN,
                    'o' => Code::KeyO,
                    'p' => Code::KeyP,
                    'q' => Code::KeyQ,
                    'r' => Code::KeyR,
                    's' => Code::KeyS,
                    't' => Code::KeyT,
                    'u' => Code::KeyU,
                    'v' => Code::KeyV,
                    'w' => Code::KeyW,
                    'x' => Code::KeyX,
                    'y' => Code::KeyY,
                    'z' => Code::KeyZ,
                    _ => return None,
                }
            } else if ch.is_ascii_digit() {
                match ch {
                    '0' => Code::Digit0,
                    '1' => Code::Digit1,
                    '2' => Code::Digit2,
                    '3' => Code::Digit3,
                    '4' => Code::Digit4,
                    '5' => Code::Digit5,
                    '6' => Code::Digit6,
                    '7' => Code::Digit7,
                    '8' => Code::Digit8,
                    '9' => Code::Digit9,
                    _ => return None,
                }
            } else {
                return None;
            }
        }
        _ => return None,
    })
}

pub fn register_initial(app: &AppHandle, bindings: &HotkeyBindings) -> Result<(), String> {
    let gs = app.global_shortcut();
    gs.unregister_all().ok();
    for chord in [
        &bindings.next_run,
        &bindings.toggle_pause,
        &bindings.log_drop,
        &bindings.toggle_overlay,
    ] {
        match parse_chord(chord) {
            Ok(sc) => {
                if let Err(e) = gs.register(sc) {
                    eprintln!("hotkey register failed for {chord}: {e}");
                }
            }
            Err(e) => eprintln!("hotkey parse failed for {chord}: {e}"),
        }
    }
    Ok(())
}

pub fn reregister(app: &AppHandle, bindings: &HotkeyBindings) -> Result<(), String> {
    register_initial(app, bindings)
}
