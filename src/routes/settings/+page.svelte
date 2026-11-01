<script lang="ts">
	import { playSuccess, unlockAudio } from '../../lib/audio';
	import { basemaps } from '../../lib/basemaps';
	import { categories } from '../../lib/categories';
	import { login, logout, osm, osmConfigured } from '../../lib/osm.svelte';
	import { saveSettings, settings } from '../../lib/settings.svelte';

	function testSound() {
		unlockAudio();
		playSuccess();
	}

	const fieldset = 'flex flex-col gap-4 rounded-xl border border-raised';
	const label = 'flex items-start gap-3';
	const field = 'mt-[0.2rem] size-[1.2rem]';
	const select = 'ml-auto rounded-lg border-0 bg-raised p-2 text-ink [font:inherit]';
	const hint = 'mt-1 block text-muted';
</script>

<div class="flex flex-col gap-4 p-4">
	<fieldset class={fieldset}>
		<legend>Start screen</legend>
		<label class={label}>
			<span>
				Open the app in
				<small class={hint}>The category shown at start, ready to record.</small>
			</span>
			<select class={select} bind:value={settings.defaultCategory} onchange={saveSettings}>
				{#each categories as c (c.id)}
					<option value={c.id}>{c.label}</option>
				{/each}
			</select>
		</label>
	</fieldset>

	<fieldset class={fieldset}>
		<legend>Location</legend>
		<label class={label}>
			<input
				class={field}
				type="radio"
				value="continuous"
				bind:group={settings.gpsMode}
				onchange={saveSettings}
			/>
			<span>
				Continuous
				<small class={hint}>
					Keeps GPS on while the app is open. Instant saves, uses more battery.
				</small>
			</span>
		</label>
		<label class={label}>
			<input
				class={field}
				type="radio"
				value="on-demand"
				bind:group={settings.gpsMode}
				onchange={saveSettings}
			/>
			<span>
				On demand
				<small class={hint}>
					Requests a position on each tap, reusing one from the last few seconds, e.g. from a
					running navigation app. May take a moment if none is available.
				</small>
			</span>
		</label>
	</fieldset>

	<fieldset class={fieldset}>
		<legend>Map</legend>
		<label class={label}>
			<span>
				Background
				<small class={hint}>The map style shown on the Map screen.</small>
			</span>
			<select class={select} bind:value={settings.basemap} onchange={saveSettings}>
				{#each basemaps as b (b.id)}
					<option value={b.id}>{b.label}</option>
				{/each}
			</select>
		</label>
	</fieldset>

	<fieldset class={fieldset}>
		<legend>OpenStreetMap</legend>
		<div class={label}>
			<span>
				{osm.token ? (osm.user ? `Logged in as ${osm.user}` : 'Logged in') : 'Not logged in'}
				<small class={hint}>
					{#if !osmConfigured}
						This build has no OpenStreetMap client id, so uploading is unavailable.
					{:else}
						Needed to upload items as notes. Cairn can only add notes, nothing else.
					{/if}
				</small>
			</span>
			{#if osm.token}
				<button class="ml-auto rounded-lg border-0 bg-raised px-4 py-2 text-ink" onclick={logout}>
					Log out
				</button>
			{:else if osmConfigured}
				<button
					class="ml-auto rounded-lg border-0 bg-raised px-4 py-2 text-ink"
					onclick={() => login('/settings')}
				>
					Login
				</button>
			{/if}
		</div>
	</fieldset>

	<fieldset class={fieldset}>
		<legend>Feedback</legend>
		<label class={label}>
			<input class={field} type="checkbox" bind:checked={settings.sound} onchange={saveSettings} />
			<span>Sound when a marker is saved</span>
		</label>
		<button class="self-start rounded-lg border-0 bg-raised px-4 py-2 text-ink" onclick={testSound}>
			Test sound
		</button>
	</fieldset>

	<fieldset class={fieldset}>
		<legend>Voice notes</legend>
		<label class={label}>
			<span>
				Note length
				<small class={hint}>
					Recording stops by itself after this long; tap the microphone to end sooner.
				</small>
			</span>
			<select class={select} bind:value={settings.voiceSeconds} onchange={saveSettings}>
				{#each [5, 10, 20, 30] as s (s)}
					<option value={s}>{s} s</option>
				{/each}
			</select>
		</label>
	</fieldset>
</div>
