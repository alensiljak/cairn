<script lang="ts">
	import Mic from '@lucide/svelte/icons/mic';
	import AmenitySign from './AmenitySign.svelte';
	import RoadsideSign from './RoadsideSign.svelte';
	import SpeedSign from './SpeedSign.svelte';
	import { amenityFeatureOf, roadsideFeatureOf } from './presets';
	import type { Marker } from './markers';

	// The same icon the marker's button shows, so records are easy to tell apart in a list.
	let { marker }: { marker: Marker } = $props();

	const roadside = $derived(roadsideFeatureOf(marker.tags));
	const amenity = $derived(amenityFeatureOf(marker.tags));
</script>

{#if marker.audio}
	<Mic class="h-full w-full" aria-hidden="true" />
{:else if amenity}
	<AmenitySign kind={amenity.id} />
{:else if marker.tags.note}
	<!-- Yellow post-it note; the ink colour follows the surrounding text. -->
	<svg viewBox="0 0 24 24" class="h-full w-full" aria-hidden="true">
		<path
			d="M3 3h18v12l-6 6H3z"
			fill="#fdd835"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linejoin="round"
		/>
		<path
			d="M21 15h-6v6"
			fill="#f9a825"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linejoin="round"
		/>
		<path d="M7 8h10M7 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
	</svg>
{:else if marker.tags.traffic_sign === 'maxspeed' && marker.tags.maxspeed}
	<SpeedSign value={marker.tags.maxspeed} />
{:else if roadside}
	<RoadsideSign kind={roadside.id} />
{/if}
