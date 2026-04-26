<script lang="ts">
  import Overlay from "./lib/components/Overlay.svelte";
  import { session } from "./lib/stores/session";
  import { settings } from "./lib/stores/settings";
  import { isTauri, setActiveProfileId } from "./lib/api";
  import { onMount, onDestroy } from "svelte";

  let unsubRemote: (() => void) | null = null;
  let unsubTicks: (() => void) | null = null;

  // Mirror the main window's profile selection.
  $: setActiveProfileId($settings.active_profile_id);

  onMount(async () => {
    if (!isTauri()) {
      session.seedDemo();
      return;
    }
    // Read-only mirror — main window is the source of truth.
    session.setReadOnly();
    await session.restoreLast();
    unsubRemote = await session.subscribeRemote();
    unsubTicks = await session.subscribeTicks();
  });

  onDestroy(() => {
    unsubRemote?.();
    unsubTicks?.();
  });
</script>

<div class="root">
  <Overlay />
</div>

<style>
  .root {
    width: 100vw;
    height: 100vh;
    background: transparent;
    overflow: hidden;
  }
</style>
