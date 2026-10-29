import Gauge from '@lucide/svelte/icons/gauge';

// Each category is a route with its own one-tap screen. Add new ones here.
export const categories = [
	{ id: 'speed-limits', label: 'Speed limits', path: '/speed-limits', icon: Gauge }
] as const;

export type Category = (typeof categories)[number];

/** The category with this id, or the first one if unknown (e.g. a stale stored setting). */
export function getCategory(id: string): Category {
	return categories.find((c) => c.id === id) ?? categories[0];
}
