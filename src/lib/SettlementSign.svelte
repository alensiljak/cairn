<script lang="ts">
	// European settlement sign: a skyline of houses, crossed out in red when leaving.
	let { exit = false }: { exit?: boolean } = $props();
</script>

<svg class="block h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
	<rect x="4" y="18" width="92" height="64" rx="6" fill="#fff" stroke="#111" stroke-width="3" />
	<g fill="#111">
		<polygon points="12,54 23,41 34,54 34,70 12,70" />
		<rect x="36" y="34" width="14" height="36" />
		<polygon points="52,52 62,39 72,52 72,70 52,70" />
		<rect x="74" y="46" width="14" height="24" />
	</g>
	<g fill="#fff">
		<rect x="39" y="40" width="3" height="4" />
		<rect x="44" y="40" width="3" height="4" />
		<rect x="39" y="50" width="3" height="4" />
		<rect x="44" y="50" width="3" height="4" />
		<rect x="59" y="56" width="6" height="14" />
		<rect x="18" y="58" width="4" height="5" />
		<rect x="25" y="58" width="4" height="5" />
	</g>
	{#if exit}
		<line x1="90" y1="22" x2="10" y2="78" stroke="#d00" stroke-width="6" stroke-linecap="round" />
	{/if}
</svg>
