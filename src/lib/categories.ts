import Gauge from '@lucide/svelte/icons/gauge';
import Store from '@lucide/svelte/icons/store';
import TrafficCone from '@lucide/svelte/icons/traffic-cone';

// Each category is a route with its own one-tap screen. Add new ones here.
// The order is the swipe order.
export const categories = [
	{ id: 'speed-limits', label: 'Speed limits', path: '/speed-limits', icon: Gauge },
	{ id: 'roadside', label: 'Roadside', path: '/roadside', icon: TrafficCone },
	{ id: 'amenity', label: 'Amenities', path: '/amenity', icon: Store }
] as const;

export type Category = (typeof categories)[number];

/** The category with this id, or the first one if unknown (e.g. a stale stored setting). */
export function getCategory(id: string): Category {
	return categories.find((c) => c.id === id) ?? categories[0];
}
