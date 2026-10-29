<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import List from '@lucide/svelte/icons/list';
	import Menu from '@lucide/svelte/icons/menu';
	import Sidebar from '../lib/Sidebar.svelte';
	import { categories } from '../lib/categories';

	let { children } = $props();
	let menuOpen = $state(false);

	const category = $derived(categories.find((c) => c.path === page.url.pathname));
	const titles: Record<string, string> = {
		'/items': 'Items',
		'/settings': 'Settings',
		'/about': 'About'
	};
	const title = $derived(category?.label ?? titles[page.url.pathname] ?? 'Cairn');
</script>

<div class="app">
	<header>
		{#if category}
			<button onclick={() => (menuOpen = true)} aria-label="Open menu"><Menu /></button>
		{:else}
			<a href={resolve('/')} aria-label="Back"><ChevronLeft /></a>
		{/if}
		<h1>{title}</h1>
		{#if category}
			<a href={resolve('/items')} aria-label="Items"><List /></a>
		{/if}
	</header>
	<main>{@render children()}</main>
</div>

<Sidebar bind:open={menuOpen} />

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
		background: #111;
		color: #eee;
		font-family: system-ui, sans-serif;
	}

	.app {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
			env(safe-area-inset-left);
		box-sizing: border-box;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.5rem;
		height: 3rem;
		flex: none;
		background: #1c1c1c;
	}

	h1 {
		margin: 0;
		font-size: 1.1rem;
		flex: 1;
	}

	header a,
	header button {
		display: flex;
		border: 0;
		color: #eee;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background: #2c2c2c;
	}

	main {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}
</style>
