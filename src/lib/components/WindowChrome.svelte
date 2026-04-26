<script lang="ts">
  export let title: string;
  export let subtitle: string | undefined = undefined;
  /** Hide the macOS-style traffic-light dots (Tauri provides its own chrome). */
  export let chromeless: boolean = false;
</script>

<div class="window">
  {#if !chromeless}
    <div class="titlebar">
      <div class="dots">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </div>
      <div class="title">
        <span class="t">{title}</span>
        {#if subtitle}
          <span class="s">{subtitle}</span>
        {/if}
      </div>
      <div class="spacer" />
      <span class="brand">D2R · Run Counter</span>
    </div>
  {/if}
  <div class="body">
    <slot />
  </div>
</div>

<style>
  .window {
    width: 100%;
    height: 100%;
    background: var(--bg-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .titlebar {
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid var(--line-soft);
    background: linear-gradient(180deg, #16181d 0%, #14161b 100%);
    gap: 12px;
    flex-shrink: 0;
  }
  .dots {
    display: flex;
    gap: 6px;
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: #3a3d45;
    border: 1px solid #2a2d34;
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-left: 4px;
  }
  .t {
    font-size: 12px;
    color: var(--fg-1);
    font-weight: 500;
    letter-spacing: 0.2px;
  }
  .s {
    font-size: 11px;
    color: var(--fg-3);
  }
  .spacer {
    flex: 1;
  }
  .brand {
    font-size: 10px;
    color: var(--fg-3);
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
