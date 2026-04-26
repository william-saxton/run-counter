<script lang="ts">
  export let name: string;
  export let size: number = 14;
  export let stroke: string = "currentColor";
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 18 18"
  fill="none"
  {stroke}
  stroke-width="1.4"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if name === "play"}
    <path d="M5 3l9 6-9 6V3z" fill={stroke} stroke="none" />
  {:else if name === "pause"}
    <g><rect x="4" y="3" width="3" height="12" fill={stroke} /><rect x="11" y="3" width="3" height="12" fill={stroke} /></g>
  {:else if name === "next"}
    <g><path d="M3 3l8 6-8 6V3z" fill={stroke} stroke="none" /><rect x="13" y="3" width="2" height="12" fill={stroke} /></g>
  {:else if name === "close"}
    <g><path d="M4 4l10 10M14 4L4 14" /></g>
  {:else if name === "grip"}
    <g>
      <circle cx="6" cy="5" r="1" fill={stroke} />
      <circle cx="6" cy="9" r="1" fill={stroke} />
      <circle cx="6" cy="13" r="1" fill={stroke} />
      <circle cx="12" cy="5" r="1" fill={stroke} />
      <circle cx="12" cy="9" r="1" fill={stroke} />
      <circle cx="12" cy="13" r="1" fill={stroke} />
    </g>
  {:else if name === "plus"}
    <g><path d="M9 3v12M3 9h12" /></g>
  {:else if name === "chevron"}
    <path d="M6 4l6 5-6 5" />
  {:else if name === "chevDown"}
    <path d="M4 7l5 6 5-6" />
  {:else if name === "search"}
    <g><circle cx="8" cy="8" r="4.5" /><path d="M11.5 11.5L15 15" /></g>
  {:else if name === "download"}
    <g><path d="M9 3v9M5 8l4 4 4-4M3 15h12" /></g>
  {:else if name === "trash"}
    <g><path d="M4 5h10M7 5V3h4v2M5 5l1 10h6l1-10" /></g>
  {:else if name === "keyboard"}
    <g><rect x="2" y="5" width="14" height="9" rx="1.5" /><path d="M5 8h.01M8 8h.01M11 8h.01M5 11h6" /></g>
  {:else if name === "target"}
    <g><circle cx="9" cy="9" r="6" /><circle cx="9" cy="9" r="2.5" /></g>
  {:else if name === "list"}
    <g><path d="M3 5h12M3 9h12M3 13h12" /></g>
  {:else if name === "chart"}
    <g>
      <path d="M3 15V3M3 15h12" />
      <rect x="5" y="9" width="2" height="5" fill={stroke} />
      <rect x="9" y="6" width="2" height="8" fill={stroke} />
      <rect x="13" y="11" width="2" height="3" fill={stroke} />
    </g>
  {:else if name === "cog"}
    <g>
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.5 1.5M12.5 12.5L14 14M4 14l1.5-1.5M12.5 5.5L14 4" />
    </g>
  {:else if name === "edit"}
    <g><path d="M3 15h3l8-8-3-3-8 8v3z" /></g>
  {:else if name === "drag"}
    <g>
      <circle cx="7" cy="5" r="1" fill={stroke} />
      <circle cx="7" cy="9" r="1" fill={stroke} />
      <circle cx="7" cy="13" r="1" fill={stroke} />
      <circle cx="11" cy="5" r="1" fill={stroke} />
      <circle cx="11" cy="9" r="1" fill={stroke} />
      <circle cx="11" cy="13" r="1" fill={stroke} />
    </g>
  {:else if name === "sparkle"}
    <g><path d="M9 2l1.5 4.5L15 8l-4.5 1.5L9 14l-1.5-4.5L3 8l4.5-1.5L9 2z" fill={stroke} stroke="none" /></g>
  {/if}
</svg>
