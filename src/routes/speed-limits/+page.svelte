<script lang="ts">
	import MarkScreen from '../../lib/MarkScreen.svelte';
	import SpeedSign from '../../lib/SpeedSign.svelte';
	import { speedLimits, speedLimitTags } from '../../lib/presets';

	const items = speedLimits.map((kmh) => ({
		id: kmh,
		label: `Speed limit ${kmh}`,
		kmh
	}));
</script>

<MarkScreen {items} tags={(item, heading) => speedLimitTags(item.kmh, heading)}>
	{#snippet sign(item)}
		<SpeedSign value={item.kmh} />
	{/snippet}
</MarkScreen>
