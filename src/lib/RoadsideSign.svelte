<script lang="ts">
	import SettlementSign from './SettlementSign.svelte';

	// Pictograms for roadside features, matching the other one-tap signs' 100x100 box.
	let {
		kind
	}: {
		kind: 'settlement-enter' | 'settlement-exit' | 'traffic-signals' | 'speed-camera' | 'crossing';
	} = $props();

	// Zebra crossing as a driver sees it: the road narrows towards a vanishing point that is off
	// to one side, so the stripes fan out at an angle instead of lying flat.
	const VP = { x: 64, y: 6 };
	const BOTTOM = 96;
	const ROAD = { left: 2, right: 98 };
	const STRIPES = 7;
	const NEAR = 82;
	const FAR = 52;

	/** x on the line from the vanishing point to `xb` at the bottom edge, at height `y`. */
	function lineX(xb: number, y: number) {
		return VP.x + ((xb - VP.x) * (y - VP.y)) / (BOTTOM - VP.y);
	}

	const stripes = Array.from({ length: STRIPES }, (_, i) => {
		const width = (ROAD.right - ROAD.left) / (2 * STRIPES + 1);
		const a = ROAD.left + width * (2 * i + 1);
		const b = a + width;
		return [
			[lineX(a, FAR), FAR],
			[lineX(b, FAR), FAR],
			[lineX(b, NEAR), NEAR],
			[lineX(a, NEAR), NEAR]
		]
			.map((p) => p.join(','))
			.join(' ');
	});
</script>

{#if kind === 'settlement-enter' || kind === 'settlement-exit'}
	<SettlementSign exit={kind === 'settlement-exit'} />
{:else}
	<svg class="block h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
		{#if kind === 'traffic-signals'}
			<rect x="32" y="8" width="36" height="84" rx="8" fill="#111" stroke="#888" stroke-width="3" />
			<circle cx="50" cy="26" r="9" fill="#e53935" />
			<circle cx="50" cy="50" r="9" fill="#fbc02d" />
			<circle cx="50" cy="74" r="9" fill="#43a047" />
		{:else if kind === 'speed-camera'}
			<!-- Roadside enforcement cabinet: tall box with a window for the camera. -->
			<rect x="30" y="8" width="40" height="84" rx="5" fill="#cfd2d6" stroke="#111" stroke-width="3" />
			<rect x="37" y="17" width="26" height="22" rx="3" fill="#111" />
			<circle cx="50" cy="28" r="6" fill="#4aa3ff" />
			<circle cx="49" cy="26.5" r="1.8" fill="#fff" />
			<rect x="40" y="46" width="20" height="8" rx="2" fill="#555" />
			<rect x="30" y="66" width="40" height="8" fill="#fbc02d" />
			<rect x="30" y="76" width="40" height="8" fill="#111" />
			<rect x="22" y="92" width="56" height="5" rx="2" fill="#777" />
		{:else}
			<polygon points="{ROAD.left},{BOTTOM} {ROAD.right},{BOTTOM} {VP.x},{VP.y}" fill="#3a3a3a" />
			{#each stripes as points (points)}
				<polygon {points} fill="#fff" />
			{/each}
		{/if}
	</svg>
{/if}
