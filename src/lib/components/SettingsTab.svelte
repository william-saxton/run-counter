<script lang="ts">
  import Btn from "./Btn.svelte";
  import Card from "./Card.svelte";
  import Chip from "./Chip.svelte";
  import HotkeyRow from "./HotkeyRow.svelte";
  import Icon from "./Icon.svelte";
  import SectionLabel from "./SectionLabel.svelte";
  import {
    settings,
    addProfile,
    removeProfile,
    renameProfile,
    setActiveProfile,
  } from "../stores/settings";
  import type { HotkeyBindings, LabelList, Profile, Session, Settings } from "../types";
  import { persistence } from "../api";

  type HKKey = keyof HotkeyBindings;

  let capturing: HKKey | null = null;

  const hkRows: { id: HKKey; label: string; desc: string }[] = [
    { id: "next_run", label: "Next run", desc: "Stops the current run, starts a new one" },
    { id: "toggle_pause", label: "Pause / Resume", desc: "Toggles the run timer" },
    { id: "log_drop", label: "Log a drop", desc: "Opens the quick drop logger" },
    { id: "toggle_overlay", label: "Toggle overlay", desc: "Show or hide the floating widget" },
  ];

  function startCapture(id: HKKey) {
    capturing = id;
  }

  function captureKey(e: KeyboardEvent) {
    if (!capturing) return;
    e.preventDefault();
    if (e.key === "Escape") {
      capturing = null;
      return;
    }
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Meta");
    const k = e.key;
    if (!["Control", "Alt", "Shift", "Meta"].includes(k)) {
      parts.push(k.length === 1 ? k.toUpperCase() : k);
      const chord = parts.join("+");
      const id = capturing;
      settings.update((s) => ({ ...s, hotkeys: { ...s.hotkeys, [id]: chord } }));
      capturing = null;
    }
  }

  function removeLabel(label: string) {
    settings.update((s) => ({ ...s, saved_labels: s.saved_labels.filter((l) => l !== label) }));
  }
  function addLabel() {
    const v = prompt("New label name");
    if (!v) return;
    settings.update((s) =>
      s.saved_labels.includes(v) ? s : { ...s, saved_labels: [...s.saved_labels, v] }
    );
  }

  /* ---------- Label list import ---------- */

  let importInput: HTMLInputElement;
  let pendingImport: LabelList | null = null;
  let importError: string | null = null;

  function openImportPicker() {
    importError = null;
    pendingImport = null;
    importInput?.click();
  }

  async function onImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ""; // allow re-picking the same file later
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = validateLabelList(parsed);
      pendingImport = list;
      importError = null;
    } catch (err) {
      pendingImport = null;
      importError = err instanceof Error ? err.message : "Failed to read file";
    }
  }

  function validateLabelList(raw: unknown): LabelList {
    if (!raw || typeof raw !== "object") {
      throw new Error("File is not a JSON object");
    }
    const o = raw as Record<string, unknown>;
    if (typeof o.name !== "string" || !o.name.trim()) {
      throw new Error("Missing 'name' field");
    }
    if (!Array.isArray(o.labels)) {
      throw new Error("Missing 'labels' array");
    }
    const labels: string[] = [];
    for (const l of o.labels) {
      if (typeof l !== "string") throw new Error("'labels' must be strings");
      const trimmed = l.trim();
      if (trimmed) labels.push(trimmed);
    }
    if (labels.length === 0) throw new Error("'labels' is empty");
    return {
      name: o.name.trim(),
      description: typeof o.description === "string" ? o.description : undefined,
      labels,
    };
  }

  function applyImport(mode: "replace" | "append") {
    if (!pendingImport) return;
    const incoming = pendingImport.labels;
    settings.update((s) => {
      if (mode === "replace") {
        return { ...s, saved_labels: [...incoming] };
      }
      const seen = new Set(s.saved_labels);
      const merged = [...s.saved_labels];
      for (const l of incoming) {
        if (!seen.has(l)) {
          seen.add(l);
          merged.push(l);
        }
      }
      return { ...s, saved_labels: merged };
    });
    pendingImport = null;
  }

  function cancelImport() {
    pendingImport = null;
    importError = null;
  }

  /* ---------- Full data export / import ---------- */

  // Bumped only on incompatible format changes.
  const DATA_EXPORT_VERSION = 1;

  interface ProfileExport {
    profile: Profile;
    active: Session | null;
    history: Session[];
  }
  interface FullExport {
    version: number;
    exported_at: number;
    settings: Settings;
    profiles: ProfileExport[];
  }

  let dataInput: HTMLInputElement;
  let dataImportError: string | null = null;
  let dataImportBusy = false;

  async function onExportAll() {
    try {
      const profiles: ProfileExport[] = [];
      for (const p of $settings.profiles) {
        const [active, history] = await Promise.all([
          persistence.loadActive(p.id),
          persistence.loadHistory(p.id),
        ]);
        profiles.push({ profile: p, active, history });
      }
      const payload: FullExport = {
        version: DATA_EXPORT_VERSION,
        exported_at: Date.now(),
        settings: $settings,
        profiles,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `run-counter-export-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after the click has been dispatched. Some browsers/webviews
      // need the URL to still be valid for the actual download to start.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function openDataImportPicker() {
    dataImportError = null;
    dataInput?.click();
  }

  async function onImportDataFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    dataImportBusy = true;
    dataImportError = null;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = validateFullExport(parsed);
      const ok = confirm(
        `Replace ALL current data with the contents of this file?\n\n` +
          `${payload.profiles.length} profile(s), ${countSessions(payload)} session(s).\n\n` +
          `This overwrites your settings, profiles, and run history. The app will reload.`
      );
      if (!ok) {
        dataImportBusy = false;
        return;
      }
      await applyFullImport(payload);
      // Hard reload so every store re-hydrates from the new data and the
      // session/overlay windows resync. Same approach as Clear history.
      location.reload();
    } catch (err) {
      dataImportError = err instanceof Error ? err.message : String(err);
      dataImportBusy = false;
    }
  }

  function countSessions(p: FullExport): number {
    let n = 0;
    for (const pe of p.profiles) {
      if (pe.active) n++;
      n += pe.history.length;
    }
    return n;
  }

  function validateFullExport(raw: unknown): FullExport {
    if (!raw || typeof raw !== "object") throw new Error("Not a JSON object");
    const o = raw as Record<string, unknown>;
    if (typeof o.version !== "number") throw new Error("Missing 'version' field");
    if (o.version !== DATA_EXPORT_VERSION) {
      throw new Error(
        `Unsupported export version ${o.version} (expected ${DATA_EXPORT_VERSION})`
      );
    }
    if (!o.settings || typeof o.settings !== "object") {
      throw new Error("Missing 'settings'");
    }
    if (!Array.isArray(o.profiles)) {
      throw new Error("Missing 'profiles' array");
    }
    // Light-touch validation — trust the rest of the shape since this is the
    // app's own export format. A bad payload that slips through will fail
    // loudly during applyFullImport.
    return o as unknown as FullExport;
  }

  async function applyFullImport(payload: FullExport) {
    // Wipe anything currently persisted so we don't leave orphan profile
    // data behind from profiles that aren't in the import.
    await persistence.clearAll();
    for (const pe of payload.profiles) {
      await persistence.saveActive(pe.active, pe.profile.id);
      await persistence.saveHistory(pe.history, pe.profile.id);
    }
    settings.set(payload.settings);
  }

  function setOpacity(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    settings.update((s) => ({ ...s, overlay_opacity: v }));
  }

  /* ---------- Profile actions ---------- */

  function onAddProfile() {
    const name = prompt("New character/profile name");
    if (!name) return;
    const p = addProfile(name.trim());
    setActiveProfile(p.id);
  }

  function onRenameProfile(p: Profile) {
    const name = prompt("Rename profile", p.name);
    if (!name) return;
    renameProfile(p.id, name.trim());
  }

  async function onDeleteProfile(p: Profile) {
    if ($settings.profiles.length <= 1) {
      alert("Can't delete the last profile.");
      return;
    }
    const ok = confirm(
      `Delete profile "${p.name}" and all its run history? This can't be undone.`
    );
    if (!ok) return;
    await persistence.clearProfile(p.id);
    removeProfile(p.id);
  }

  async function onClearActiveProfile() {
    const ok = confirm(
      `Clear all run history for the active profile? This won't delete the profile itself.`
    );
    if (!ok) return;
    await persistence.clearProfile($settings.active_profile_id);
    location.reload();
  }
</script>

<svelte:window on:keydown={captureKey} />

<div class="root scroll">
  <div class="col">
    <Card padding={18}>
      <SectionLabel>
        Profiles
        <button slot="right" class="add-link" on:click={onAddProfile}>
          <Icon name="plus" size={11} stroke="var(--accent)" /> Add profile
        </button>
      </SectionLabel>
      <div class="profile-list">
        {#each $settings.profiles as p (p.id)}
          <div class="profile-row" class:active={p.id === $settings.active_profile_id}>
            <button class="profile-pick" on:click={() => setActiveProfile(p.id)}>
              <span class="dot" class:active={p.id === $settings.active_profile_id} />
              <span class="name">{p.name}</span>
              {#if p.id === $settings.active_profile_id}
                <span class="active-tag">Active</span>
              {/if}
            </button>
            <div class="profile-actions">
              <button class="icon-btn" title="Rename" on:click={() => onRenameProfile(p)}>
                <Icon name="edit" size={12} stroke="var(--fg-3)" />
              </button>
              <button
                class="icon-btn"
                title="Delete"
                disabled={$settings.profiles.length <= 1}
                on:click={() => onDeleteProfile(p)}
              >
                <Icon name="trash" size={12} stroke="var(--fg-3)" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </Card>

    <Card padding={18}>
      <SectionLabel>
        Hotkeys
        <span slot="right" class="meta">Global · works in-game</span>
      </SectionLabel>
      {#each hkRows as row}
        <HotkeyRow
          label={row.label}
          desc={row.desc}
          chord={$settings.hotkeys[row.id]}
          capturing={capturing === row.id}
          onClick={() => startCapture(row.id)}
        />
      {/each}
    </Card>

    <Card padding={18}>
      <SectionLabel>
        Saved labels
        <span slot="right" class="header-actions">
          <button class="add-link" on:click={openImportPicker}>
            <Icon name="download" size={11} stroke="var(--accent)" /> Import from file…
          </button>
          <button class="add-link" on:click={addLabel}>
            <Icon name="plus" size={11} stroke="var(--accent)" /> Add label
          </button>
        </span>
      </SectionLabel>
      <input
        bind:this={importInput}
        type="file"
        accept="application/json,.json"
        class="hidden-file"
        on:change={onImportFile}
      />
      {#if pendingImport}
        <div class="import-preview">
          <div class="import-head">
            <span class="import-title">{pendingImport.name}</span>
            <span class="import-count">{pendingImport.labels.length} labels</span>
          </div>
          {#if pendingImport.description}
            <div class="import-desc">{pendingImport.description}</div>
          {/if}
          <div class="import-sample">
            {pendingImport.labels.slice(0, 6).join(" · ")}{pendingImport.labels.length > 6 ? " · …" : ""}
          </div>
          <div class="import-actions">
            <Btn icon="download" kind="primary" on:click={() => applyImport("replace")}>
              Replace
            </Btn>
            <Btn icon="plus" on:click={() => applyImport("append")}>Append</Btn>
            <Btn on:click={cancelImport}>Cancel</Btn>
          </div>
        </div>
      {:else if importError}
        <div class="import-error">Couldn't import: {importError}</div>
      {/if}
      {#if $settings.saved_labels.length === 0}
        <div class="empty-labels">
          No saved labels yet. Use <strong>Add label</strong> to create one, or
          <strong>Import from file…</strong> to load a shared list.
        </div>
      {:else}
        <div class="chip-grid">
          {#each $settings.saved_labels as l}
            <Chip removable on:click={() => removeLabel(l)}>{l}</Chip>
          {/each}
        </div>
      {/if}
    </Card>

    <Card padding={18}>
      <SectionLabel>Overlay</SectionLabel>
      <div class="opacity-row">
        <div class="op-head">
          <span class="opt-label">Opacity</span>
          <span class="spacer" />
          <span class="num op-val">{$settings.overlay_opacity}%</span>
        </div>
        <input
          type="range"
          min="40"
          max="100"
          value={$settings.overlay_opacity}
          on:input={setOpacity}
          class="slider"
        />
      </div>

      <div class="toggle-row">
        <div class="left">
          <span class="opt-label">Lock position</span>
          <span class="opt-desc">Prevent accidental dragging during play</span>
        </div>
        <button
          class="toggle"
          class:on={$settings.overlay_lock}
          on:click={() => settings.update((s) => ({ ...s, overlay_lock: !s.overlay_lock }))}
        >
          <span class="knob" />
        </button>
      </div>

      <div class="toggle-row">
        <div class="left">
          <span class="opt-label">Always on top</span>
          <span class="opt-desc">Keep overlay above the game window</span>
        </div>
        <button
          class="toggle"
          class:on={$settings.overlay_always_on_top}
          on:click={() =>
            settings.update((s) => ({ ...s, overlay_always_on_top: !s.overlay_always_on_top }))}
        >
          <span class="knob" />
        </button>
      </div>
    </Card>

    <Card padding={18}>
      <SectionLabel>Data</SectionLabel>
      <div class="toggle-row">
        <div class="left">
          <span class="opt-label">Resume last session on launch</span>
          <span class="opt-desc">Restore the most recent unfinished session</span>
        </div>
        <button
          class="toggle"
          class:on={$settings.resume_on_launch}
          on:click={() =>
            settings.update((s) => ({ ...s, resume_on_launch: !s.resume_on_launch }))}
        >
          <span class="knob" />
        </button>
      </div>
      <div class="toggle-row">
        <div class="left">
          <span class="opt-label">Auto-detect game window</span>
          <span class="opt-desc">Pause timer when the game loses focus, resume when it regains focus</span>
        </div>
        <button
          class="toggle"
          class:on={$settings.auto_pause_on_focus_loss}
          on:click={() =>
            settings.update((s) => ({
              ...s,
              auto_pause_on_focus_loss: !s.auto_pause_on_focus_loss,
            }))}
        >
          <span class="knob" />
        </button>
      </div>
      {#if $settings.auto_pause_on_focus_loss}
        <div class="text-row">
          <div class="left">
            <span class="opt-label">Game process name</span>
            <span class="opt-desc">Executable name of the game to track (case-insensitive)</span>
          </div>
          <input
            class="text-input num"
            type="text"
            bind:value={$settings.game_process_name}
            placeholder="game.exe"
          />
        </div>
      {/if}
      <div class="export-row">
        <div class="left">
          <span class="opt-label">Export all data</span>
          <span class="opt-desc">Settings, profiles, sessions, runs, and drops as a single JSON file</span>
        </div>
        <Btn icon="download" on:click={onExportAll}>Export</Btn>
      </div>
      <div class="export-row">
        <div class="left">
          <span class="opt-label">Import data</span>
          <span class="opt-desc">
            Replace all current data with a previously-exported JSON file
          </span>
        </div>
        <Btn icon="download" on:click={openDataImportPicker}>
          {dataImportBusy ? "Importing…" : "Import…"}
        </Btn>
      </div>
      <input
        bind:this={dataInput}
        type="file"
        accept="application/json,.json"
        class="hidden-file"
        on:change={onImportDataFile}
      />
      {#if dataImportError}
        <div class="import-error">Couldn't import: {dataImportError}</div>
      {/if}
      <div class="toggle-row danger">
        <div class="left">
          <span class="opt-label danger">Clear history</span>
          <span class="opt-desc">Permanently deletes all sessions and run data for the active profile</span>
        </div>
        <Btn icon="trash" danger on:click={onClearActiveProfile}>Clear…</Btn>
      </div>
    </Card>
    <div class="bottom-pad" />
  </div>
</div>

<style>
  .root {
    flex: 1;
    min-height: 0;
    padding: 24px;
    overflow: auto;
  }
  .col {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .meta {
    font-size: 10px;
    color: var(--fg-3);
  }
  .add-link {
    all: unset;
    cursor: pointer;
    font-size: 11px;
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .header-actions {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }
  .hidden-file {
    display: none;
  }
  .empty-labels {
    font-size: 11px;
    color: var(--fg-3);
    padding: 8px 4px;
    line-height: 1.5;
  }
  .empty-labels strong {
    color: var(--fg-1);
    font-weight: 500;
  }
  .import-preview {
    margin: 4px 0 12px;
    padding: 12px 14px;
    border: 1px solid rgba(224, 181, 104, 0.3);
    background: var(--accent-glow);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .import-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .import-title {
    font-size: 13px;
    color: var(--fg-1);
    font-weight: 500;
  }
  .import-count {
    font-size: 10px;
    color: var(--fg-3);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .import-desc {
    font-size: 11px;
    color: var(--fg-2);
    line-height: 1.4;
  }
  .import-sample {
    font-size: 11px;
    color: var(--fg-3);
    line-height: 1.5;
  }
  .import-actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  .import-error {
    margin: 4px 0 12px;
    padding: 10px 12px;
    border: 1px solid var(--danger, #b85a5a);
    border-radius: 8px;
    font-size: 11px;
    color: var(--danger, #b85a5a);
  }
  .opacity-row {
    padding: 12px 4px;
    border-bottom: 1px solid var(--line-soft);
  }
  .op-head {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  .op-val {
    font-size: 12px;
    color: var(--accent);
  }
  .spacer {
    flex: 1;
  }
  .opt-label {
    font-size: 13px;
    color: var(--fg-1);
  }
  .opt-label.danger {
    color: var(--danger);
  }
  .opt-desc {
    font-size: 11px;
    color: var(--fg-3);
  }
  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--bg-0);
    border-radius: 2px;
    border: 1px solid var(--line-soft);
    outline: none;
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 10px rgba(224, 181, 104, 0.5);
    cursor: grab;
    border: 0;
  }
  .slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 10px rgba(224, 181, 104, 0.5);
    border: 0;
    cursor: grab;
  }
  .toggle-row,
  .export-row,
  .text-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--line-soft);
  }
  .toggle-row .left,
  .export-row .left,
  .text-row .left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .text-input {
    width: 160px;
    padding: 7px 10px;
    background: var(--bg-0);
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--fg);
    font-size: 12px;
    outline: none;
  }
  .text-input:focus {
    border-color: var(--accent);
  }
  .toggle {
    all: unset;
    width: 32px;
    height: 18px;
    border-radius: 999px;
    background: var(--bg-3);
    border: 1px solid var(--line);
    position: relative;
    cursor: pointer;
    transition: background 160ms, border-color 160ms;
  }
  .toggle.on {
    background: var(--accent);
    border-color: var(--accent-2);
  }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #9da0a8;
    transition: left 160ms, background 160ms;
  }
  .toggle.on .knob {
    left: 16px;
    background: #1a1206;
  }
  .bottom-pad {
    height: 8px;
  }

  /* Profiles */
  .profile-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .profile-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px 6px 4px;
    border: 1px solid transparent;
    border-radius: 8px;
  }
  .profile-row:hover {
    background: var(--bg-3);
  }
  .profile-row.active {
    border-color: rgba(224, 181, 104, 0.25);
    background: var(--accent-glow);
  }
  .profile-pick {
    all: unset;
    flex: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 6px;
  }
  .profile-pick .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--bg-3);
    border: 1px solid var(--line);
    flex-shrink: 0;
  }
  .profile-pick .dot.active {
    background: var(--accent);
    border-color: var(--accent-2);
    box-shadow: 0 0 8px rgba(224, 181, 104, 0.6);
  }
  .profile-pick .name {
    font-size: 13px;
    color: var(--fg-1);
    flex: 1;
  }
  .active-tag {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(224, 181, 104, 0.4);
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .profile-actions {
    display: flex;
    gap: 2px;
  }
  .icon-btn {
    all: unset;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    cursor: pointer;
    color: var(--fg-3);
  }
  .icon-btn:hover {
    background: var(--bg-2);
    color: var(--fg-1);
  }
  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
