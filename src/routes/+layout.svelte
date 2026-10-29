<script lang="ts">
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import List from '@lucide/svelte/icons/list';
	import Menu from '@lucide/svelte/icons/menu';
	import Sidebar from '../lib/Sidebar.svelte';
	import { categories } from '../lib/categories';

	let { children } = $props();
	let menuOpen = $state(false);

	const category = $derived(categories.find((c) => c.path === page.url.pathname));
	const canSwipe = $derived(category !== undefined && categories.length > 1);

	// Slide direction of the navigation in progress: 1 = next (new page enters from the right),
	// -1 = previous, 0 = not a swipe (no animation).
	let slide = $state<1 | -1 | 0>(0);

	function slideParams(from: 1 | -1) {
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		return { x: slide * from * window.innerWidth, duration: slide && !reduced ? 250 : 0 };
	}

	/** Move to the next (+1) or previous (-1) category, wrapping around. */
	async function cycle(step: 1 | -1) {
		if (!category || menuOpen || slide) return;
		const i = categories.findIndex((c) => c.id === category.id);
		const next = categories[(i + step + categories.length) % categories.length];
		slide = step;
		try {
			await goto(resolve(next.path));
			await tick();
		} finally {
			slide = 0;
			drag = undefined;
		}
	}

	const SWIPE_MIN = 60; // px
	let touch: { x: number; y: number } | undefined;
	// Live finger offset of the page currently shown, so it follows the drag.
	let drag = $state<{ path: string; dx: number; active: boolean } | undefined>();

	function onTouchStart(e: TouchEvent) {
		touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : undefined;
	}

	function onTouchMove(e: TouchEvent) {
		if (!touch || !canSwipe || menuOpen || slide) return;
		const dx = e.touches[0].clientX - touch.x;
		const dy = e.touches[0].clientY - touch.y;
		if (!drag && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
		if (!drag && Math.abs(dx) <= Math.abs(dy)) {
			touch = undefined; // vertical gesture, leave it alone
			return;
		}
		drag = { path: page.url.pathname, dx, active: true };
	}

	function onTouchEnd(e: TouchEvent) {
		if (!touch) return;
		const dx = e.changedTouches[0].clientX - touch.x;
		const dy = e.changedTouches[0].clientY - touch.y;
		touch = undefined;
		// Mostly horizontal and long enough, so taps and vertical drags are ignored.
		if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy)) {
			if (drag) drag.active = false;
			void cycle(dx < 0 ? 1 : -1);
		} else {
			drag = undefined; // springs back
		}
	}

	function onTouchCancel() {
		touch = undefined;
		drag = undefined;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
		if (e.key === 'ArrowLeft') cycle(-1);
		else if (e.key === 'ArrowRight') cycle(1);
	}
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
	<div class="stage">
		<main
			ontouchstart={onTouchStart}
			ontouchmove={onTouchMove}
			ontouchend={onTouchEnd}
			ontouchcancel={onTouchCancel}
		>
			{#key page.url.pathname}
				<div
					class="page"
					class:dragging={drag?.active}
					style:transform={drag?.path === page.url.pathname ? `translateX(${drag.dx}px)` : undefined}
					in:fly={slideParams(1)}
					out:fly={slideParams(-1)}
				>
					{@render children()}
				</div>
			{/key}
		</main>
		{#if canSwipe}
			<span class="hint prev" aria-hidden="true"><ChevronLeft /></span>
			<span class="hint next" aria-hidden="true"><ChevronRight /></span>
		{/if}
	</div>
</div>

<svelte:window onkeydown={onKeydown} />

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

	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
	}

	main {
		position: relative;
		height: 100%;
		overflow: hidden; /* clips pages sliding in and out */
		/* Vertical scrolling stays native; horizontal swipes are ours. */
		touch-action: pan-y;
	}

	/* Stacked so the outgoing and incoming pages can slide side by side. */
	.page {
		position: absolute;
		inset: 0;
		overflow: auto;
		background: #111;
		transition: transform 0.2s;
	}

	.page.dragging {
		transition: none;
	}

	/* Faint swipe hints: bottom corners in portrait, vertical middle of the sides in landscape. */
	.hint {
		position: absolute;
		bottom: 0.5rem;
		display: flex;
		color: #eee;
		opacity: 0.3;
		pointer-events: none;
	}

	.prev {
		left: 0.75rem;
	}

	.next {
		right: 0.75rem;
	}

	@media (orientation: landscape) {
		.hint {
			bottom: auto;
			top: 50%;
			transform: translateY(-50%);
		}

		.prev {
			left: 0.5rem;
		}

		.next {
			right: 0.5rem;
		}
	}
</style>
