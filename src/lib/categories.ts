import Gauge from '@lucide/svelte/icons/gauge';
import House from '@lucide/svelte/icons/house';

// Each category is a route with its own one-tap screen. Add new ones here.
// The order is the swipe order.
export const categories = [
	{ id: 'speed-limits', label: 'Speed limits', path: '/speed-limits', icon: Gauge },
	{ id: 'settlements', label: 'Settlements', path: '/settlements', icon: House }
] as const;

export type Category = (typeof categories)[number];

/** The category with this id, or the first one if unknown (e.g. a stale stored setting). */
export function getCategory(id: string): Category {
	return categories.find((c) => c.id === id) ?? categories[0];
}
