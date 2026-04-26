<script lang="ts"></script>

<div class="section-label">
  <span><slot /></span>
  <span class="spacer" />
  <slot name="right" />
</div>

<style>
  .section-label {
    display: flex;
    align-items: center;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--fg-3);
    margin-bottom: 10px;
  }
  .spacer {
    flex: 1;
  }
</style>
