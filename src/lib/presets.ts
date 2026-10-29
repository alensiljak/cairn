// OSM tags for each one-tap feature.
// https://wiki.openstreetmap.org/wiki/Key:traffic_sign
// https://wiki.openstreetmap.org/wiki/Tag:amenity=charging_station

export const speedLimits = [30, 50, 60, 70, 80, 100];

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
function settlementTags(exit: boolean, heading: number | null): Record<string, string> {
	const tags: Record<string, string> = { traffic_sign: 'city_limit' };
	if (exit) tags.city_limit = 'end';
	return withDirection(tags, heading);
}

/**
 * Roadside signs and features. Traffic lights and speed cameras have no `direction`: the one
 * seen may face either way, so it is not recorded.
 * https://wiki.openstreetmap.org/wiki/Tag:highway=traffic_signals
 * https://wiki.openstreetmap.org/wiki/Tag:highway=speed_camera
 * https://wiki.openstreetmap.org/wiki/Tag:highway=crossing
 */
export const roadsideFeatures = [
	{
		id: 'settlement-enter',
		label: 'Settlement entry',
		tags: (heading: number | null) => settlementTags(false, heading)
	},
	{
		id: 'settlement-exit',
		label: 'Settlement exit',
		tags: (heading: number | null) => settlementTags(true, heading)
	},
	{
		id: 'traffic-signals',
		label: 'Traffic lights',
		tags: () => ({ highway: 'traffic_signals' })
	},
	{ id: 'speed-camera', label: 'Speed camera', tags: () => ({ highway: 'speed_camera' }) },
	{
		id: 'crossing',
		label: 'Marked pedestrian crossing',
		tags: () => ({ highway: 'crossing', crossing: 'uncontrolled', 'crossing:markings': 'yes' })
	}
] as const;

// Planned categories:
//   petrol station  amenity=fuel
//   parking         amenity=parking
//   charger         amenity=charging_station
