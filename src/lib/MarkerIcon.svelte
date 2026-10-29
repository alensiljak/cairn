<script lang="ts">
	import Mic from '@lucide/svelte/icons/mic';
	import RoadsideSign from './RoadsideSign.svelte';
	import SpeedSign from './SpeedSign.svelte';
	import { roadsideFeatureOf } from './presets';
	import type { Marker } from './markers';

	// The same icon the marker's button shows, so records are easy to tell apart in a list.
	let { marker }: { marker: Marker } = $props();

	const roadside = $derived(roadsideFeatureOf(marker.tags));
</script>

{#if marker.audio}
	<Mic class="h-full w-full" aria-hidden="true" />
{:else if marker.tags.traffic_sign === 'maxspeed' && marker.tags.maxspeed}
	<SpeedSign value={marker.tags.maxspeed} />
{:else if roadside}
	<RoadsideSign kind={roadside.id} />
{/if}
