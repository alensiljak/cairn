// OSM tags for each one-tap feature.
// https://wiki.openstreetmap.org/wiki/Key:traffic_sign
// https://wiki.openstreetmap.org/wiki/Tag:amenity=charging_station

export const speedLimits = [30, 50, 60, 70, 80, 100];

/**
 * Tags for a speed limit sign node. A sign faces oncoming traffic, so its `direction` is
 * opposite to the direction of travel; omitted when the heading is unknown (e.g. standing still).
 */
export function speedLimitTags(kmh: number, heading: number | null): Record<string, string> {
	const tags: Record<string, string> = { traffic_sign: 'maxspeed', maxspeed: String(kmh) };
	if (heading !== null && Number.isFinite(heading)) {
		tags.direction = String(Math.round((heading + 180) % 360));
	}
	return tags;
}

// Planned categories:
//   petrol station  amenity=fuel
//   parking         amenity=parking
//   charger         amenity=charging_station
//   settlement      traffic_sign=city_limit + name=* (+ city_limit=end when leaving)
