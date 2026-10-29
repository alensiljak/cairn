<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { categories } from './categories';
	import Info from '@lucide/svelte/icons/info';
	import MapIcon from '@lucide/svelte/icons/map';
	import Settings from '@lucide/svelte/icons/settings';
	import X from '@lucide/svelte/icons/x';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const close = () => (open = false);

	const item =
		'flex items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-3 text-ink no-underline [font:inherit] aria-[current=page]:bg-raised';
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div
	class="fixed inset-0 z-10 bg-black/60 transition-opacity duration-200 {open
		? 'pointer-events-auto opacity-100'
		: 'pointer-events-none opacity-0'}"
	onclick={close}
	role="presentation"
></div>

<nav
	class="fixed top-0 bottom-0 left-0 z-11 box-border w-[min(18rem,85vw)] overflow-y-auto bg-panel pt-[env(safe-area-inset-top)] pr-2 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] transition-transform duration-200 {open
		? 'translate-x-0'
		: '-translate-x-full'}"
	aria-label="Menu"
	inert={!open}
>
	<div class="flex h-12 items-center justify-between pl-2 text-[1.1rem] font-semibold">
		<span>Cairn</span>
		<button class={item} onclick={close} aria-label="Close menu"><X /></button>
	</div>

	<h2 class="mt-4 mb-1 ml-2 text-xs font-semibold tracking-wider text-muted uppercase">
		Categories
	</h2>
	{#each categories as c (c.id)}
		<a
			class={item}
			href={resolve(c.path)}
			data-sveltekit-replacestate
			onclick={close}
			aria-current={page.url.pathname === c.path ? 'page' : undefined}
		>
			<c.icon />
			{c.label}
		</a>
	{/each}

	<hr class="my-3 h-px border-0 bg-line" />

	<a
		class={item}
		href={resolve('/map')}
		onclick={close}
		aria-current={page.url.pathname === '/map' ? 'page' : undefined}
	>
		<MapIcon /> Map
	</a>
	<a
		class={item}
		href={resolve('/settings')}
		onclick={close}
		aria-current={page.url.pathname === '/settings' ? 'page' : undefined}
	>
		<Settings /> Settings
	</a>
	<a
		class={item}
		href={resolve('/about')}
		onclick={close}
		aria-current={page.url.pathname === '/about' ? 'page' : undefined}
	>
		<Info /> About
	</a>
</nav>
