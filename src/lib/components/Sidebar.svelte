<script lang="ts">
  import Icon from "./Icon.svelte";
  import Dot from "./Dot.svelte";
  import { settings, setActiveProfile } from "../stores/settings";

  export let active: string;
  export let onChange: (id: string) => void;

  const items = [
    { id: "live", label: "Live", icon: "target" },
    { id: "history", label: "History", icon: "list" },
    { id: "stats", label: "Stats", icon: "chart" },
    { id: "settings", label: "Settings", icon: "cog" },
  ];

  let pickerOpen = false;
  $: activeProfile =
    $settings.profiles.find((p) => p.id === $settings.active_profile_id) ?? $settings.profiles[0];

  function pick(id: string) {
    setActiveProfile(id);
    pickerOpen = false;
  }
</script>

<aside class="sidebar">
  <div class="brand">
    <div class="logo">R</div>
    <div class="name">
      <span class="t">Run Counter</span>
      <span class="v">v0.1.0</span>
    </div>
  </div>

  {#each items as it}
    <button
      class="item"
      class:active={active === it.id}
      on:click={() => onChange(it.id)}
    >
      {#if active === it.id}
        <span class="rail" />
      {/if}
      <Icon
        name={it.icon}
        size={14}
        stroke={active === it.id ? "var(--accent)" : "currentColor"}
      />
      <span>{it.label}</span>
    </button>
  {/each}

  <div class="spacer" />

  <!-- Profile switcher -->
  <div class="profile-picker">
    <button class="profile-trigger" on:click={() => (pickerOpen = !pickerOpen)}>
      <span class="caption">Profile</span>
      <span class="name">{activeProfile?.name ?? "—"}</span>
      <Icon name="chevDown" size={10} stroke="var(--fg-3)" />
    </button>
    {#if pickerOpen}
      <div class="profile-menu">
        {#each $settings.profiles as p (p.id)}
          <button
            class="profile-opt"
            class:active={p.id === $settings.active_profile_id}
            on:click={() => pick(p.id)}
          >
            <span class="dot" class:active={p.id === $settings.active_profile_id} />
            <span>{p.name}</span>
          </button>
        {/each}
        <div class="opt-sep" />
        <button class="profile-opt link" on:click={() => { onChange("settings"); pickerOpen = false; }}>
          <Icon name="cog" size={11} stroke="var(--fg-3)" />
          <span>Manage profiles…</span>
        </button>
      </div>
    {/if}
  </div>

  <div class="status">
    <Dot color="var(--ok)" size={6} glow={false} />
    <span>Hotkeys active</span>
  </div>
</aside>

<style>
  .sidebar {
    width: 188px;
    flex-shrink: 0;
    background: var(--bg-2);
    border-right: 1px solid var(--line-soft);
    padding: 18px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 10px 18px;
  }
  .logo {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 11px;
    color: #1a1206;
  }
  .name {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  .name .t {
    color: var(--fg);
    font-size: 12px;
    font-weight: 600;
  }
  .name .v {
    color: var(--fg-3);
    font-size: 10px;
  }
  .item {
    all: unset;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--fg-2);
    background: transparent;
    font-size: 13px;
    font-weight: 400;
    position: relative;
    transition: background 120ms, color 120ms;
  }
  .item:hover {
    background: var(--bg-3);
    color: var(--fg-1);
  }
  .item.active {
    color: var(--fg);
    background: var(--bg-3);
    font-weight: 500;
  }
  .rail {
    position: absolute;
    left: -12px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--accent);
    border-radius: 2px;
  }
  .spacer {
    flex: 1;
  }
  .status {
    margin: 0 4px 4px;
    padding: 10px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--fg-2);
  }

  /* Profile picker */
  .profile-picker {
    position: relative;
    margin: 0 4px 6px;
  }
  .profile-trigger {
    all: unset;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-1);
    transition: border-color 120ms, background 120ms;
  }
  .profile-trigger:hover {
    background: var(--bg-3);
    border-color: var(--line);
  }
  .profile-trigger .caption {
    font-size: 9px;
    color: var(--fg-3);
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }
  .profile-trigger .name {
    flex: 1;
    font-size: 12px;
    color: var(--fg-1);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
  }
  .profile-menu {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--bg-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.6);
    z-index: 10;
  }
  .profile-opt {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 6px;
    font-size: 12px;
    color: var(--fg-1);
  }
  .profile-opt:hover {
    background: var(--bg-3);
  }
  .profile-opt.active {
    color: var(--accent);
  }
  .profile-opt.link {
    color: var(--fg-2);
    font-size: 11px;
  }
  .profile-opt .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--bg-3);
    border: 1px solid var(--line);
  }
  .profile-opt .dot.active {
    background: var(--accent);
    border-color: var(--accent-2);
    box-shadow: 0 0 6px rgba(224, 181, 104, 0.5);
  }
  .opt-sep {
    height: 1px;
    background: var(--line-soft);
    margin: 4px 2px;
  }
</style>
