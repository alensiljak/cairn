<script lang="ts">
	import Mic from '@lucide/svelte/icons/mic';
	import { toggleVoice, voice } from './voice.svelte';
</script>

<button
	class:recording={voice.phase === 'recording'}
	class:starting={voice.phase === 'starting'}
	onclick={toggleVoice}
	aria-label={voice.phase === 'recording' ? 'Stop voice note' : 'Record voice note'}
>
	<Mic />
	{#if voice.phase === 'recording'}<span>{voice.remaining}</span>{/if}
</button>

{#if voice.message}
	<p class="toast" role="status">{voice.message}</p>
{/if}

<style>
	button {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		border: 0;
		border-radius: 0.5rem;
		padding: 0.5rem;
		min-width: 2.5rem;
		justify-content: center;
		background: #2c2c2c;
		color: #eee;
	}

	button.starting {
		background: #6b5a1f;
	}

	button.recording {
		background: #c62828;
		animation: pulse 1s infinite;
	}

	span {
		font-variant-numeric: tabular-nums;
		font-weight: bold;
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom) + 2.5rem);
		transform: translateX(-50%);
		margin: 0;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		background: #333;
		color: #eee;
		font-size: 0.9rem;
		z-index: 10;
	}

	@media (prefers-reduced-motion: no-preference) {
		@keyframes pulse {
			50% {
				opacity: 0.6;
			}
		}
	}
</style>
