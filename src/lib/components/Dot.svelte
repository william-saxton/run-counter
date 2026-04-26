<script lang="ts">
  export let color: string = "var(--accent)";
  export let size: number = 8;
  export let glow: boolean = true;

  $: glowColor = color === "var(--accent)" ? "rgba(224,181,104,0.6)" : color;
</script>

<span
  class="dot"
  style:width="{size}px"
  style:height="{size}px"
  style:background={color}
  style:box-shadow={glow ? `0 0 8px ${glowColor}` : "none"}
/>

<style>
  .dot {
    display: inline-block;
    border-radius: 999px;
    flex-shrink: 0;
  }
</style>
