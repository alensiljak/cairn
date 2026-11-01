<script lang="ts">
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import MapIcon from '@lucide/svelte/icons/map';
	import Menu from '@lucide/svelte/icons/menu';
	import '../app.css';
	import ConfirmDialog from '../lib/ConfirmDialog.svelte';
	import Sidebar from '../lib/Sidebar.svelte';
	import VoiceButton from '../lib/VoiceButton.svelte';
	import VoiceSheet from '../lib/VoiceSheet.svelte';
	import { categories } from '../lib/categories';

	let { children } = $props();
	let menuOpen = $state(false);
	let voiceOpen = $state(false);

	const category = $derived(categories.find((c) => c.path === page.url.pathname));
	const canSwipe = $derived(category !== undefined && categories.length > 1);

	// Whether the current page was reached from another page of the app (so history.back() stays in it).
	let canGoBack = false;
	afterNavigate((nav) => {
		canGoBack = nav.type !== 'enter' && nav.from !== null;
	});

	/** Header back button: pop the page off the history, or replace it with home if opened directly. */
	function goBack(e: MouseEvent) {
		e.preventDefault();
		if (canGoBack) history.back();
		else void goto(resolve('/'), { replaceState: true });
	}

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
			// Replace, so swiping between categories leaves no history entries.
			await goto(resolve(next.path), { replaceState: true });
			await tick();
		} finally {
			slide = 0;
			drag = undefined;
		}
	}

	const SWIPE_MIN = 60; // px
	let touch: { x: number; y: number } | undefined;
	// The current gesture turned out to be vertical (a possible swipe down for the voice sheet).
	let vertical = false;
	// Live finger offset of the page currently shown, so it follows the drag.
	let drag = $state<{ path: string; dx: number; active: boolean } | undefined>();

	function onTouchStart(e: TouchEvent) {
		touch =
			e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : undefined;
		vertical = false;
	}

	function onTouchMove(e: TouchEvent) {
		if (!touch || !canSwipe || menuOpen || slide || vertical) return;
		const dx = e.touches[0].clientX - touch.x;
		const dy = e.touches[0].clientY - touch.y;
		if (!drag && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
		if (!drag && Math.abs(dx) <= Math.abs(dy)) {
			vertical = true; // not a category swipe; onTouchEnd checks for a swipe down
			return;
		}
		drag = { path: page.url.pathname, dx, active: true };
	}

	function onTouchEnd(e: TouchEvent) {
		if (!touch) return;
		const dx = e.changedTouches[0].clientX - touch.x;
		const dy = e.changedTouches[0].clientY - touch.y;
		touch = undefined;
		// Swipe down: the voice note sheet.
		if (category && !menuOpen && dy >= SWIPE_MIN && dy > 1.5 * Math.abs(dx)) {
			voiceOpen = true;
			drag = undefined;
			return;
		}
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
		'/map': 'Map',
		'/settings': 'Settings',
		'/about': 'About'
	};
	const title = $derived(category?.label ?? titles[page.url.pathname] ?? 'Cairn');

	const headerButton = 'flex rounded-lg border-0 bg-raised p-2 text-ink';
	// Faint swipe hints: bottom corners in portrait, vertical middle of the sides in landscape.
	const hint =
		'pointer-events-none absolute bottom-2 flex text-ink opacity-30 landscape:top-1/2 landscape:bottom-auto landscape:-translate-y-1/2';
</script>

<div
	class="box-border flex h-dvh flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
>
	<header class="flex h-12 flex-none items-center gap-2 bg-panel px-2">
		{#if category}
			<button class={headerButton} onclick={() => (menuOpen = true)} aria-label="Open menu">
				<Menu />
			</button>
		{:else}
			<a class={headerButton} href={resolve('/')} onclick={goBack} aria-label="Back"
				><ChevronLeft /></a
			>
		{/if}
		<h1 class="m-0 flex-1 text-[1.1rem]">{title}</h1>
		{#if category}
			<a
				class={headerButton}
				href={resolve('/map')}
				aria-label="Map"
				aria-current={page.url.pathname === '/map' ? 'page' : undefined}
			>
				<MapIcon />
			</a>
			<VoiceButton sheetOpen={voiceOpen} />
		{/if}
	</header>
	<div class="relative min-h-0 flex-1">
		<!-- Vertical scrolling stays native, except on category pages (swipe down is ours there) and
			the map (it handles its own gestures). -->
		<main
			class="relative h-full overflow-hidden"
			ontouchstart={onTouchStart}
			ontouchmove={onTouchMove}
			ontouchend={onTouchEnd}
			ontouchcancel={onTouchCancel}
			style:touch-action={category || page.url.pathname === '/map' ? 'none' : 'pan-y'}
		>
			{#key page.url.pathname}
				<!-- Stacked so the outgoing and incoming pages can slide side by side. -->
				<div
					class="absolute inset-0 overflow-auto bg-night {drag?.active
						? 'transition-none'
						: 'transition-transform duration-200'}"
					style:transform={drag?.path === page.url.pathname
						? `translateX(${drag.dx}px)`
						: undefined}
					in:fly={slideParams(1)}
					out:fly={slideParams(-1)}
				>
					{@render children()}
				</div>
			{/key}
		</main>
		{#if category}
			<VoiceSheet bind:open={voiceOpen} />
		{/if}
		{#if canSwipe}
			<span class="{hint} left-3 landscape:left-2" aria-hidden="true"><ChevronLeft /></span>
			<span class="{hint} right-3 landscape:right-2" aria-hidden="true"><ChevronRight /></span>
		{/if}
	</div>
</div>

<svelte:window onkeydown={onKeydown} />

<Sidebar bind:open={menuOpen} />
<ConfirmDialog />
