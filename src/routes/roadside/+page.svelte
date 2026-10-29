<script lang="ts">
	import MarkScreen from '../../lib/MarkScreen.svelte';
	import RoadsideSign from '../../lib/RoadsideSign.svelte';
	import { roadsideFeatures } from '../../lib/presets';
</script>

<MarkScreen items={[...roadsideFeatures]} tags={(item, heading) => item.tags(heading)}>
	{#snippet sign(item)}
		<RoadsideSign kind={item.id} />
	{/snippet}
</MarkScreen>
