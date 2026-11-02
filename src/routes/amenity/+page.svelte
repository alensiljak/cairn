<script lang="ts">
	import AmenitySign from '../../lib/AmenitySign.svelte';
	import MarkScreen from '../../lib/MarkScreen.svelte';
	import { amenityFeatures } from '../../lib/presets';
</script>

<!-- One tap saves just the amenity; subtype, fee etc. are added later in the editor. -->
<MarkScreen items={[...amenityFeatures]} tags={(item) => ({ amenity: item.amenity })}>
	{#snippet sign(item)}
		<AmenitySign kind={item.id} />
	{/snippet}
</MarkScreen>
