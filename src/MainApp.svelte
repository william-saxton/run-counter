<script lang="ts">
  import WindowChrome from "./lib/components/WindowChrome.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import HeaderStrip from "./lib/components/HeaderStrip.svelte";
  import LiveTab from "./lib/components/LiveTab.svelte";
  import HistoryTab from "./lib/components/HistoryTab.svelte";
  import StatsTab from "./lib/components/StatsTab.svelte";
  import SettingsTab from "./lib/components/SettingsTab.svelte";
  import DropModal from "./lib/components/DropModal.svelte";
  import Btn from "./lib/components/Btn.svelte";
  import {
    session as sessionApi,
    session,
    sessionElapsedMs,
    activeRun,
  } from "./lib/stores/session";
  import { settings } from "./lib/stores/settings";
  import { formatDuration } from "./lib/timer";
  import { onMount, onDestroy } from "svelte";
  import {
    isTauri,
    listenEvent,
    toggleOverlayWindow,
    getHotkeys,
    setHotkeys,
    setActiveProfileId,
    setGameProcess,
  } from "./lib/api";

  let active = "live";
  let dropOpen = false;
  let unlisteners: Array<() => void> = [];

  // Visible debug — flashes a small badge whenever a hotkey event reaches
  // the frontend. Useful to diagnose whether the IPC path is healthy without
  // popping devtools.
  /** Tracks whether the active run was paused by the auto-focus watcher
   *  (so we know it's safe to auto-resume when focus returns). User-driven
   *  pauses don't set this, so they survive focus changes. */
  let autoPaused = false;

  function onChangeTab(id: string) {
    active = id;
  }
  function startSession() {
    sessionApi.startSession($settings.saved_labels[0] ?? null);
  }
  function endSession() {
    if (confirm("End the current session?")) sessionApi.endSession();
  }
  function togglePauseSession() {
    sessionApi.togglePause();
  }

  function addCustomLabel() {
    const v = prompt("Label name");
    if (!v) return;
    settings.update((s) =>
      s.saved_labels.includes(v) ? s : { ...s, saved_labels: [...s.saved_labels, v] }
    );
    sessionApi.setActiveLabel(v);
  }

  function onGlobalKey(e: KeyboardEvent) {
    if (isTauri()) return; // Tauri handles global hotkeys natively
    if (dropOpen) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    const k = e.key;
    if (k === "F9") {
      e.preventDefault();
      sessionApi.nextRun();
    } else if (k === "F10") {
      e.preventDefault();
      sessionApi.togglePause();
    } else if (k === "F11") {
      e.preventDefault();
      dropOpen = true;
    }
  }

  // Keep the persistence layer pointed at the active profile.
  $: setActiveProfileId($settings.active_profile_id);

  // When the active profile changes, drop in-memory session and reload from storage.
  let lastProfileId = $settings.active_profile_id;
  $: if ($settings.active_profile_id !== lastProfileId) {
    lastProfileId = $settings.active_profile_id;
    sessionApi.applyRemote(null);
    sessionApi.restoreLast();
  }

  onMount(async () => {
    if (isTauri()) {
      try {
        await initTauri();
      } catch (err) {
        console.error("Tauri init failed:", err);
      }
    } else if (!$session.session) {
      sessionApi.seedDemo();
    }
  });

  async function initTauri() {
    // Sync hotkey bindings with backend.
    let remote: typeof $settings.hotkeys | null = null;
    try {
      remote = await getHotkeys();
    } catch (err) {
      console.error("getHotkeys failed:", err);
    }
    if (remote) {
      settings.update((s) => ({ ...s, hotkeys: remote! }));
    } else {
      try {
        await setHotkeys($settings.hotkeys);
      } catch (err) {
        console.error("setHotkeys failed:", err);
      }
    }

    unlisteners.push(
      await listenEvent("hotkey:next_run", () => {
        // Auto-start a session if none is active so F9 always feels useful.
        if (!$session.session) {
          sessionApi.startSession($settings.saved_labels[0] ?? null);
        } else {
          sessionApi.nextRun();
        }
      }),
      await listenEvent("hotkey:toggle_pause", () => {
        if ($session.session) sessionApi.togglePause();
      }),
      await listenEvent("hotkey:log_drop", () => {
        if ($session.session) dropOpen = true;
      }),
      await listenEvent("hotkey:toggle_overlay", () => {
        toggleOverlayWindow();
      }),
      await listenEvent<boolean>("game:focus", (focused) => {
        if (!$settings.auto_pause_on_focus_loss) return;
        const run = $activeRun;
        if (!run) return;
        if (!focused && run.status === "active") {
          autoPaused = true;
          sessionApi.togglePause();
        } else if (focused && run.status === "paused" && autoPaused) {
          autoPaused = false;
          sessionApi.togglePause();
        } else if (focused) {
          // User manually paused or resumed; clear our marker.
          autoPaused = false;
        }
      })
    );

    // Push the configured game process name to the watcher.
    try {
      await setGameProcess($settings.game_process_name);
    } catch (err) {
      console.error("setGameProcess failed:", err);
    }

    // Resume last session if configured.
    if ($settings.resume_on_launch) {
      await sessionApi.restoreLast();
    }
  }

  onDestroy(() => {
    for (const u of unlisteners) u();
  });

  // Persist hotkey changes to backend.
  let lastHotkeys = JSON.stringify($settings.hotkeys);
  $: if (isTauri()) {
    const next = JSON.stringify($settings.hotkeys);
    if (next !== lastHotkeys) {
      lastHotkeys = next;
      setHotkeys($settings.hotkeys);
    }
  }

  // Push game-process changes to the watcher.
  let lastGameProcess = $settings.game_process_name;
  $: if (isTauri() && $settings.game_process_name !== lastGameProcess) {
    lastGameProcess = $settings.game_process_name;
    setGameProcess($settings.game_process_name).catch((err) =>
      console.error("setGameProcess failed:", err)
    );
  }

  $: hasSession = !!$session.session;
  $: sessionRunning = ($activeRun?.status ?? null) === "active";
  $: sessionTitle = $session.session
    ? `${$session.session.default_label ?? "Mixed"} · ${new Date(
        $session.session.started_at
      ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "No active session";
  $: sessionTimeStr = formatDuration($sessionElapsedMs);
</script>

<svelte:window on:keydown={onGlobalKey} />

<div class="app">
  <WindowChrome
    title="Run Counter"
    subtitle={hasSession ? "— " + sessionTitle : undefined}
    chromeless={isTauri()}
  >
    <div class="layout">
      <Sidebar {active} onChange={onChangeTab} />
      <div class="content">
        {#if hasSession}
          <HeaderStrip
            session={sessionTitle}
            sessionTime={sessionTimeStr}
            running={sessionRunning}
            onToggle={togglePauseSession}
            onEnd={endSession}
          />
        {:else}
          <div class="no-session-bar">
            <span class="caption">No active session</span>
            <div class="spacer" />
            <Btn kind="primary" icon="play" on:click={startSession}>Start a session</Btn>
          </div>
        {/if}

        {#if active === "live"}
          <LiveTab
            onOpenDropModal={() => (dropOpen = true)}
            onAddCustomLabel={addCustomLabel}
          />
        {:else if active === "history"}
          <HistoryTab onStart={startSession} />
        {:else if active === "stats"}
          <StatsTab onStart={startSession} />
        {:else if active === "settings"}
          <SettingsTab />
        {/if}
      </div>
    </div>
  </WindowChrome>

  {#if dropOpen}
    <DropModal onClose={() => (dropOpen = false)} />
  {/if}
</div>

<style>
  .app {
    width: 100vw;
    height: 100vh;
    background: #0a0a0c;
    display: grid;
    place-items: stretch;
  }
  .layout {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .no-session-bar {
    height: 60px;
    flex-shrink: 0;
    padding: 0 24px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--bg-1);
  }
  .caption {
    font-size: 12px;
    color: var(--fg-2);
  }
  .spacer {
    flex: 1;
  }
</style>
