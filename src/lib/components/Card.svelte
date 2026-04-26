<script lang="ts">
  export let padding: number = 18;
  let className = "";
  export { className as class };
</script>

<div class="card {className}" style:padding="{padding}px">
  <slot />
</div>

<style>
  .card {
    background: var(--bg-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
  }
</style>
