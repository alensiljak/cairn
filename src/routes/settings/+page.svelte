<script lang="ts">
	import { playSuccess, unlockAudio } from '../../lib/audio';
	import { categories } from '../../lib/categories';
	import { saveSettings, settings } from '../../lib/settings.svelte';

	function testSound() {
		unlockAudio();
		playSuccess();
	}
</script>

<div class="settings">
	<fieldset>
		<legend>Start screen</legend>
		<label>
			<span>
				Open the app in
				<small>The category shown at start, ready to record.</small>
			</span>
			<select bind:value={settings.defaultCategory} onchange={saveSettings}>
				{#each categories as c (c.id)}
					<option value={c.id}>{c.label}</option>
				{/each}
			</select>
		</label>
	</fieldset>

	<fieldset>
		<legend>Location</legend>
		<label>
			<input
				type="radio"
				value="continuous"
				bind:group={settings.gpsMode}
				onchange={saveSettings}
			/>
			<span>
				Continuous
				<small>Keeps GPS on while the app is open. Instant saves, uses more battery.</small>
			</span>
		</label>
		<label>
			<input type="radio" value="on-demand" bind:group={settings.gpsMode} onchange={saveSettings} />
			<span>
				On demand
				<small>
					Requests a position on each tap, reusing one from the last few seconds, e.g. from a
					running navigation app. May take a moment if none is available.
				</small>
			</span>
		</label>
	</fieldset>

	<fieldset>
		<legend>Feedback</legend>
		<label>
			<input type="checkbox" bind:checked={settings.sound} onchange={saveSettings} />
			<span>Sound when a marker is saved</span>
		</label>
		<button onclick={testSound}>Test sound</button>
	</fieldset>

	<fieldset>
		<legend>Voice notes</legend>
		<label>
			<span>
				Note length
				<small>Recording stops by itself after this long; tap the microphone to end sooner.</small>
			</span>
			<select bind:value={settings.voiceSeconds} onchange={saveSettings}>
				{#each [5, 10, 20, 30] as s (s)}
					<option value={s}>{s} s</option>
				{/each}
			</select>
		</label>
	</fieldset>
</div>

<style>
	.settings {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	fieldset {
		border: 1px solid #2c2c2c;
		border-radius: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	input {
		margin-top: 0.2rem;
		width: 1.2rem;
		height: 1.2rem;
	}

	select {
		margin-left: auto;
		padding: 0.5rem;
		border-radius: 0.5rem;
		border: 0;
		background: #2c2c2c;
		color: #eee;
		font: inherit;
	}

	small {
		display: block;
		color: #999;
		margin-top: 0.25rem;
	}

	button {
		align-self: flex-start;
		border: 0;
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		background: #2c2c2c;
		color: #eee;
	}
</style>
