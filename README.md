# Run Counter

A small desktop app for keeping track of repeated runs in grindy games — Mephisto runs, dungeon farms, speedrun attempts, anything where you do the same thing over and over and want to know how many times, how long it took, and what dropped.

It runs alongside your game with global hotkeys and an optional always-on-top floating overlay, so you never have to alt-tab to log a run.

Built with [Tauri 2](https://tauri.app/), [Svelte](https://svelte.dev/), and TypeScript. All data is stored locally — nothing is sent anywhere.

---

## What it does

- **Sessions, runs, and drops.** A *session* is a play sitting; it contains one or more *runs*; each run can have any number of *drops* (loot or notes) attached to it.
- **Global hotkeys.** Start a run, pause, log a drop, or toggle the overlay without leaving the game.
- **Floating overlay.** A small always-on-top widget showing the live timer, run number, label, and average — sized to tuck into a screen corner.
- **Auto-pause on focus loss.** Optionally watches a configured game process and pauses the timer when the game loses focus, resuming when it comes back. Manual pauses are never overridden.
- **Profiles.** Independent slots for sessions and history — useful if you play multiple characters or multiple games.
- **Stats.** Totals, averages, fastest/slowest, per-label breakdown, and a run-time histogram, scoped to the current session, all time, or a single past session.
- **Saved labels.** Pre-load common targets so you don't retype them each session. Label lists can be exported/imported as JSON to share between machines or with other players. See [examples/labels/](examples/labels/) for a sample list.
- **Local-only data with full export/import.** One-click JSON backup of every profile, session, run, drop, and setting.

---

## Using the app

### Default hotkeys

| Action          | Default   | What it does                                                                |
| --------------- | --------- | --------------------------------------------------------------------------- |
| Next run        | F9        | Closes the current run and starts a new one. If no session is active, starts one. |
| Pause / Resume  | F10       | Toggles the timer on the current run.                                       |
| Log a drop      | F11       | Opens the drop logger.                                                      |
| Toggle overlay  | Ctrl+F12  | Shows or hides the floating overlay.                                        |

All four can be rebound under **Settings → Hotkeys**.

### Quick start

1. Click **Start a session** (or press **F9**). A run begins immediately.
2. Pick a label from the *Quick-pick label* strip, or click **+ Custom** to type a one-off.
3. Press **F9** at the end of each run to close it out and start the next.
4. Press **F11** during a run to log a drop. Type the item name and press **Enter**.
5. Click **End** in the header strip when you're done.

For the full walkthrough — Live tab, History tab, Stats tab, settings, profiles, label sharing, troubleshooting — see the [user guide](docs/index.md).

---

## Installing

Grab the latest installer or portable build from the [Releases page](../../releases) and run it. If you'd rather build from source, see [Contributing](#contributing) below.

---

## Contributing

Contributions are welcome. The project is small and the code is meant to stay readable.

### Prerequisites

- **Node.js** 18 or newer (for the Vite/Svelte frontend).
- **Rust** stable toolchain (for the Tauri backend). Install via [rustup](https://rustup.rs/).
- **Platform-specific Tauri prerequisites** — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/). On Windows, this means the WebView2 runtime (already on Windows 11) and the MSVC build tools.

### Setup

```bash
git clone https://github.com/<your-fork>/run-counter.git
cd run-counter
npm install
```

### Run in dev mode

```bash
npm run tauri dev
```

This starts Vite for the frontend and launches the Tauri app pointing at it. Hot reload works for the Svelte side; Rust changes trigger a backend rebuild.

You can also run the frontend in the browser without Tauri:

```bash
npm run dev
```

The browser build uses an in-memory shim for the Tauri APIs and seeds demo data, which is handy for iterating on UI.

### Type check

```bash
npm run check
```

### Production build

```bash
npm run tauri build
```

Outputs an installer and unpackaged binaries under [src-tauri/target/release/](src-tauri/target/release/).

### Project layout

- [src/](src/) — Svelte + TypeScript frontend.
  - [src/MainApp.svelte](src/MainApp.svelte) — main window root.
  - [src/OverlayApp.svelte](src/OverlayApp.svelte) — floating overlay root.
  - [src/lib/components/](src/lib/components/) — UI components.
  - [src/lib/stores/](src/lib/stores/) — session and settings stores.
  - [src/lib/api.ts](src/lib/api.ts) — the bridge to Tauri (with a browser-mode shim).
- [src-tauri/](src-tauri/) — Rust backend.
  - [src-tauri/src/hotkeys.rs](src-tauri/src/hotkeys.rs) — global hotkey registration.
  - [src-tauri/src/game_focus.rs](src-tauri/src/game_focus.rs) — process-focus watcher driving auto-pause.
  - [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) — window configuration.
- [docs/](docs/) — user-facing documentation (also published as a GitHub Pages site).
- [examples/labels/](examples/labels/) — sample label-list JSON files.

### Guidelines

- Keep the UI keyboard-first. Anything that costs an alt-tab or a mouse trip during play is a regression.
- Don't break the data format casually. Exported JSON should remain importable by current builds; if you have to change the schema, bump the format version and write a migration in [src-tauri/migrations/](src-tauri/migrations/).
- The overlay window is read-only by design — it mirrors state, it doesn't drive it. Run/session mutations belong in the main window or behind a hotkey.
- Run `npm run check` before opening a PR.

### Reporting bugs and requesting features

Open a GitHub issue. For bug reports, please include:

- Run Counter version (visible in the Settings tab footer).
- OS and version.
- Steps to reproduce, expected vs. actual.
- If the issue involves a hotkey not firing, the list of other tools that might be holding the same combo (Steam, Discord, OBS, Stream Deck, AutoHotkey, etc.).

---

## License

[GNU AGPL v3](LICENSE).
