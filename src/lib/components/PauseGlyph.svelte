<script lang="ts">
  export let size: number = 8;
  export let color: string = "var(--fg-2)";
</script>

<span class="glyph" style:width="{size}px" style:height="{size}px">
  <span style:width="2px" style:height="{size}px" style:background={color} />
  <span style:width="2px" style:height="{size}px" style:background={color} />
</span>

<style>
  .glyph {
    display: inline-flex;
    gap: 2px;
    align-items: center;
  }
  .glyph > span {
    border-radius: 1px;
  }
</style>
