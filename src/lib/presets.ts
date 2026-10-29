// OSM tags for each one-tap feature.
// https://wiki.openstreetmap.org/wiki/Key:traffic_sign
// https://wiki.openstreetmap.org/wiki/Tag:amenity=charging_station

export const speedLimits = [30, 50, 60, 70, 80, 100];

export const settlementSigns = [
	{ id: 'enter', label: 'Settlement entry', exit: false },
	{ id: 'exit', label: 'Settlement exit', exit: true }
];

/**
 * Adds the `direction` of a sign node. A sign faces oncoming traffic, so its `direction` is
 * opposite to the direction of travel; omitted when the heading is unknown (e.g. standing still).
 */
function withDirection(tags: Record<string, string>, heading: number | null) {
	if (heading !== null && Number.isFinite(heading)) {
		tags.direction = String(Math.round((heading + 180) % 360));
	}
	return tags;
}

export function speedLimitTags(kmh: number, heading: number | null): Record<string, string> {
	return withDirection({ traffic_sign: 'maxspeed', maxspeed: String(kmh) }, heading);
}

/** Settlement name is not captured on the road; add it later from the items list. */
export function settlementTags(exit: boolean, heading: number | null): Record<string, string> {
	const tags: Record<string, string> = { traffic_sign: 'city_limit' };
	if (exit) tags.city_limit = 'end';
	return withDirection(tags, heading);
}

// Planned categories:
//   petrol station  amenity=fuel
//   parking         amenity=parking
//   charger         amenity=charging_station
