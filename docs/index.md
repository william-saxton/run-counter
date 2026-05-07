---
title: Run Counter — User Guide
---

# Run Counter — User Guide

Run Counter is a small desktop app for keeping track of repeated runs in grindy games — Mephisto runs, dungeon farms, speedrun attempts, anything where you do the same thing over and over and want to know how many times, how long it took, and what dropped.

It runs alongside your game with global hotkeys and an optional floating overlay, so you never have to alt-tab to log a run.

> **In a hurry?** Press **F9** to start (or finish and start the next) run, **F10** to pause, **F11** to log a drop, and **Ctrl+F12** to show or hide the floating overlay. Everything else in this guide is optional.

---

## Table of contents

- [Concepts at a glance](#concepts-at-a-glance)
- [Your first session](#your-first-session)
- [The Live tab](#the-live-tab)
- [Logging drops](#logging-drops)
- [The floating overlay](#the-floating-overlay)
- [Hotkeys](#hotkeys)
- [History](#history)
- [Stats](#stats)
- [Settings](#settings)
  - [Profiles](#profiles)
  - [Saved labels](#saved-labels)
  - [Overlay options](#overlay-options)
  - [Auto-pause when the game loses focus](#auto-pause-when-the-game-loses-focus)
  - [Resume on launch](#resume-on-launch)
  - [Export and import all data](#export-and-import-all-data)
  - [Clear history](#clear-history)
- [Sharing label lists](#sharing-label-lists)
- [FAQ and troubleshooting](#faq-and-troubleshooting)

---

## Concepts at a glance

Run Counter has three nested pieces:

- **Session** — a play sitting. Starts when you click *Start a session* (or press **F9** when no session is running) and ends when you click *End*. A session contains one or more runs.
- **Run** — a single attempt at the thing you're farming. Runs have a label (e.g. *Mephisto*), a timer, and any drops you logged during them.
- **Drop** — a piece of loot or any note worth recording during a run. Each drop is timestamped and attached to the run it was logged in.

You can also have multiple **Profiles** — useful if you play more than one character or more than one game. Each profile has its own session history and stats.

---

## Your first session

1. Open Run Counter.
2. Click **Start a session** in the top bar. A new run begins immediately and the timer starts counting up.
3. Pick a label for what you're farming — either tap one of the chips under *Quick-pick label*, or click **+ Custom** to type a one-off name. (You can pre-load common targets in [Settings → Saved labels](#saved-labels).)
4. When the run is done, press **F9** (or click **Next run**). The current run is closed out and a fresh one starts with the same label.
5. To stop entirely, click **End** in the header strip and confirm.

That's the loop. Everything else is polish.

---

## The Live tab

The Live tab is your in-session dashboard.

**Hero card (top).** Shows your current run status, label, the live timer, and your average / fastest run so far in this session. The big buttons are:

- **Next run** — closes the current run and starts a new one (same as **F9**).
- **Pause / Resume** — stops or restarts the timer without ending the run (same as **F10**). Paused time doesn't count toward run duration.
- **Reset** — sets the current run's timer back to 00:00. Drops you've already logged on this run are kept.

Below the buttons is the **Quick-pick label** strip — every label saved in Settings, plus a *Custom* button. Clicking a chip changes the label of the current run on the fly, so you can switch targets mid-session without ending it.

**Drop logger (right).** Click *Log a drop…* (or press **F11**) to open the drop modal. Drops you've already logged this session show up here, newest first, tagged with the run they belong to.

**Recent runs (bottom).** A list of every run in the current session with its label, duration, and drop count. The currently active run is highlighted.

---

## Logging drops

Press **F11** (or click *Log a drop…*) to bring up the drop logger. It's a single text box:

- Type the name of what dropped and press **Enter** to save it to the current run.
- Recently-logged drops appear underneath the input. Use **↑ / ↓** to highlight one and **Enter** to log a duplicate without retyping.
- **Esc** closes the modal without logging anything.

Drops are attached to whatever run is active at the moment you save them — if you're paused, the drop still belongs to the current run.

---

## The floating overlay

The overlay is a small always-on-top widget that shows your live timer, run number, label, and average — designed to sit in a corner of your screen while you play.

- Toggle it with **Ctrl+F12** (configurable).
- Drag it by clicking and holding anywhere on the body — but only when the *Lock position* setting is **off**.
- Adjust transparency, lock state, and "always on top" in [Settings → Overlay](#overlay-options).

The overlay is read-only. It mirrors whatever the main window is showing; you can't start, end, or pause runs from it directly — use the hotkeys for that. The overlay's window position and size are remembered between launches.

---

## Hotkeys

Run Counter registers four global hotkeys, meaning they work even when the game has focus.

| Action | Default | What it does |
|---|---|---|
| **Next run** | F9 | Ends the current run and starts a new one. If no session is active, starts one. |
| **Pause / Resume** | F10 | Toggles the timer on the current run. |
| **Log a drop** | F11 | Opens the drop logger. |
| **Toggle overlay** | Ctrl+F12 | Shows or hides the floating overlay. |

Want to change them? Open **Settings → Hotkeys**, click the chord for the binding you want to change, and press the new key combination. **Esc** cancels capture.

> **Tip.** If a hotkey doesn't seem to fire while the game has focus, make sure no other tool (Steam, Discord, OBS, another macro program) has reserved the same combo. The first program to register a global hotkey wins.

---

## History

The History tab is a searchable archive of every session you've completed (plus the active one, if any).

- **Search box** matches against run labels and drop text. Useful for "did I ever drop X?" questions.
- **Label chips** filter by the most-used labels in your history.
- **Date filter** narrows to the last 7 or 30 days.
- Click any session row to expand it and see its individual runs, durations, and drops.

The active session always appears at the top with an **Active** tag until you end it.

---

## Stats

The Stats tab summarises completed runs: totals, averages, fastest, slowest, a per-label breakdown, and a histogram of run durations.

The scope toggle at the top decides what you're aggregating over:

- **Current** — only the active session.
- **All time** — every session in the active profile.
- **Pick a past session…** — drill into a single past session.

The *By target* chart shows how many runs you've done per label (top label highlighted in gold) and the average time for each. The *Run-time distribution* histogram bins your run times from 0:30 to 3:00+ — handy for spotting your "typical" run length and the occasional disaster.

---

## Settings

Open the Settings tab from the sidebar. Each section is described below.

### Profiles

A profile is an independent slot for sessions, runs, and history. Use them to keep different characters or different games separate.

- **Add profile** — top-right of the Profiles card. Pick a name; it becomes a new empty profile.
- **Switch profiles** — click any profile in the list, or use the profile dropdown at the bottom of the sidebar.
- **Rename / Delete** — pencil and trash icons next to each profile. The last remaining profile can't be deleted.

Switching profiles loads that profile's sessions into the History and Stats tabs and starts using it for any new sessions you start.

### Saved labels

Labels are the chips that show up under *Quick-pick label* on the Live tab. Add the targets you farm regularly so you don't have to retype them.

- **+ Add label** — type a single label name.
- **Import from file…** — load a label list shared as JSON. See [Sharing label lists](#sharing-label-lists).
- Click a chip's **×** to remove it.

When you start a new session, the first label in this list becomes the session's default.

### Overlay options

- **Opacity** — slider from 40% to 100%. Lower values let the game show through.
- **Lock position** — when on, the overlay can't be dragged. Recommended during play; turn off briefly to reposition it.
- **Always on top** — keep the overlay above the game window. Mostly you want this on; turn it off if you want the overlay to behave like a normal window.

### Auto-pause when the game loses focus

When *Auto-detect game window* is on, Run Counter watches the game's process and automatically pauses the run timer when the game loses focus, then resumes when focus comes back. You'll see a *Game process name* field appear — fill in the executable name of your game, e.g. `D2R.exe` or `game.exe` (case-insensitive).

A few notes:

- Manual pauses (via **F10** or the Pause button) are never overridden by the auto-pause logic. If you pause manually, the timer stays paused even if the game regains focus.
- Brief focus blips (e.g. an in-game alert tab-out) are debounced, so you won't see a flicker of pause/resume on every minor event.

### Resume on launch

When *Resume last session on launch* is on, Run Counter will reload the most recent unfinished session when you start the app, so you can pick up where you left off. Turn it off if you'd rather start clean every time.

### Export and import all data

The **Export all data** button writes a single JSON file containing every profile, every session, every run, every drop, and your settings — useful for backups or moving to another machine.

**Import data** does the reverse. **It replaces everything.** A confirmation dialog tells you how many profiles and sessions are in the file; if you accept, the app overwrites all current data and reloads. Only files exported by the same version (or one with a matching format version) will import cleanly.

### Clear history

Permanently deletes all sessions and runs for the **active profile**. Other profiles are untouched. The profile itself stays — only its history is wiped. There's no undo, so use it sparingly. Use *Export all data* first if you want a safety net.

---

## Sharing label lists

You can share a set of labels with someone else (or a future you on a different machine) via a small JSON file.

A label-list file looks like this:

```json
{
  "name": "Diablo 2 Resurrected",
  "description": "Common D2R run targets",
  "labels": [
    "Mephisto",
    "Pindle",
    "Baal",
    "Andariel",
    "Diablo",
    "Cows",
    "Countess",
    "Trav"
  ]
}
```

- `name` (required) is shown in the import preview.
- `description` (optional) appears under the name.
- `labels` (required, non-empty) is the list of labels to import.

To import: **Settings → Saved labels → Import from file…**, pick the file, then choose:

- **Replace** — discards your current labels and uses the imported list.
- **Append** — adds any labels from the file that you don't already have, leaving the rest alone.
- **Cancel** — back out without changing anything.

---

## FAQ and troubleshooting

**The hotkeys don't work while my game is focused.**
A global hotkey is owned by whichever program registered it first. If something else (Steam, Discord, OBS, an Elgato Stream Deck, AutoHotkey) is using F9/F10/F11, change Run Counter's binding in *Settings → Hotkeys* to something free.

**My run timer keeps pausing on its own.**
You probably have *Auto-detect game window* turned on with a process name that doesn't match the game you're playing — when the timer thinks the game lost focus, it pauses. Either correct the process name or turn the toggle off in *Settings → Data*.

**The overlay won't move.**
*Lock position* is on. Open Settings, turn it off, drag the overlay where you want it, then turn the lock back on so you don't bump it during play.

**I closed the app mid-session — did I lose my runs?**
No. Sessions are saved continuously. As long as *Resume last session on launch* is on, the next launch will reload the session in progress. If you turned it off, the session still exists in your History — it just won't auto-resume.

**Can I edit a run after the fact?**
Not yet — the History tab is read-only. The intended workflow is to log accurately as you go (drops via **F11**, label via the Live tab chips). If you absolutely need to fix bad data, export, edit the JSON, and import.

**Does Run Counter read my game's memory or files?**
No. It only watches whether a process with the configured name has the foreground window (for the optional auto-pause feature). It doesn't read game memory, save files, or screen contents.

**Where is my data stored?**
Locally, on your machine. Nothing is sent anywhere. The *Export all data* button is the supported way to make a backup or move data between machines.
