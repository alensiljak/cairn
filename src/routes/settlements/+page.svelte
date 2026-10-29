<script lang="ts">
	import MarkScreen from '../../lib/MarkScreen.svelte';
	import SettlementSign from '../../lib/SettlementSign.svelte';
	import { settlementSigns, settlementTags } from '../../lib/presets';
</script>

<MarkScreen items={settlementSigns} tags={(item, heading) => settlementTags(item.exit, heading)}>
	{#snippet sign(item)}
		<SettlementSign exit={item.exit} />
	{/snippet}
</MarkScreen>
