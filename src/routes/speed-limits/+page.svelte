<script lang="ts">
	import MarkScreen from '../../lib/MarkScreen.svelte';
	import SpeedSign from '../../lib/SpeedSign.svelte';
	import { speedLimits, speedLimitTags } from '../../lib/presets';
	import { settings } from '../../lib/settings.svelte';

	// Ascending, whatever order the setting was stored in.
	const items = $derived(
		speedLimits
			.filter((kmh) => settings.speedLimits.includes(kmh))
			.map((kmh) => ({ id: kmh, label: `Speed limit ${kmh}`, kmh }))
	);
</script>

<MarkScreen {items} tags={(item, heading) => speedLimitTags(item.kmh, heading)}>
	{#snippet sign(item)}
		<SpeedSign value={item.kmh} />
	{/snippet}
</MarkScreen>
