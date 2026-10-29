<script lang="ts">
	let { value }: { value: number | string } = $props();
</script>

<svg class="block h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
	<circle cx="50" cy="50" r="48" fill="#fff" />
	<circle cx="50" cy="50" r="38" fill="none" stroke="#d00" stroke-width="14" />
	<text
		x="50"
		y="50"
		text-anchor="middle"
		dominant-baseline="central"
		font-family="Arial, Helvetica, sans-serif"
		font-weight="700"
		font-size={String(value).length > 2 ? 30 : 38}
		fill="#111">{value}</text
	>
</svg>
