<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { categories } from './categories';
	import Info from '@lucide/svelte/icons/info';
	import Settings from '@lucide/svelte/icons/settings';
	import X from '@lucide/svelte/icons/x';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const close = () => (open = false);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="backdrop" class:open onclick={close} role="presentation"></div>

<nav class:open aria-label="Menu" inert={!open}>
	<div class="top">
		<span>Cairn</span>
		<button onclick={close} aria-label="Close menu"><X /></button>
	</div>

	<h2>Categories</h2>
	{#each categories as c (c.id)}
		<a
			href={resolve(c.path)}
			onclick={close}
			aria-current={page.url.pathname === c.path ? 'page' : undefined}
		>
			<c.icon />
			{c.label}
		</a>
	{/each}

	<hr />

	<a
		href={resolve('/settings')}
		onclick={close}
		aria-current={page.url.pathname === '/settings' ? 'page' : undefined}
	>
		<Settings /> Settings
	</a>
	<a
		href={resolve('/about')}
		onclick={close}
		aria-current={page.url.pathname === '/about' ? 'page' : undefined}
	>
		<Info /> About
	</a>
</nav>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.6);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s;
		z-index: 10;
	}

	.backdrop.open {
		opacity: 1;
		pointer-events: auto;
	}

	nav {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		width: min(18rem, 85vw);
		box-sizing: border-box;
		padding: env(safe-area-inset-top) 0.5rem env(safe-area-inset-bottom) env(safe-area-inset-left);
		background: #1c1c1c;
		transform: translateX(-100%);
		transition: transform 0.2s;
		z-index: 11;
		overflow-y: auto;
	}

	nav.open {
		transform: none;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 3rem;
		padding-left: 0.5rem;
		font-weight: 600;
		font-size: 1.1rem;
	}

	h2 {
		margin: 1rem 0 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
	}

	a,
	button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.5rem;
		border: 0;
		border-radius: 0.5rem;
		background: none;
		color: #eee;
		font: inherit;
		text-decoration: none;
	}

	a[aria-current='page'] {
		background: #2c2c2c;
	}

	hr {
		border: 0;
		border-top: 1px solid #333;
		margin: 0.75rem 0;
	}
</style>
