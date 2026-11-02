// OSM tags for each one-tap feature.
// https://wiki.openstreetmap.org/wiki/Key:traffic_sign
// https://wiki.openstreetmap.org/wiki/Tag:amenity=charging_station

/** Every speed limit that can be offered, ascending. */
export const speedLimits = [30, 40, 50, 60, 70, 80, 90, 100, 120, 130];

/** The speed limits shown until the user chooses their own. */
export const defaultSpeedLimits = [30, 50, 60, 70, 80, 100];

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

/** The roadside feature a marker's tags were generated from, ignoring `direction`. */
export function roadsideFeatureOf(tags: Record<string, string>) {
	const { direction: _direction, ...rest } = tags;
	return roadsideFeatures.find((f) => {
		const expected: Record<string, string> = f.tags(null);
		const keys = Object.keys(expected);
		return keys.length === Object.keys(rest).length && keys.every((k) => rest[k] === expected[k]);
	});
}

/** A detail of a feature that is filled in later, in the editor, never while driving. */
export interface Field {
	key: string;
	label: string;
	/** Fixed choices (shown as buttons); free text if absent. */
	options?: readonly { value: string; label: string }[];
	/** Hint for free text fields. */
	placeholder?: string;
}

const yesNo = [
	{ value: 'yes', label: 'Yes' },
	{ value: 'no', label: 'No' }
] as const;

const fee: Field = { key: 'fee', label: 'Fee', options: yesNo };
const name: Field = { key: 'name', label: 'Name' };
const operator: Field = { key: 'operator', label: 'Operator' };

/**
 * Amenities. One tap saves only `amenity=*`; the `fields` are details added afterwards in the
 * editor. Unlike the roadside features they match on `amenity` alone, as the editor adds tags.
 * https://wiki.openstreetmap.org/wiki/Tag:amenity=parking
 * https://wiki.openstreetmap.org/wiki/Tag:amenity=charging_station
 * https://wiki.openstreetmap.org/wiki/Tag:amenity=car_wash
 */
export const amenityFeatures = [
	{
		id: 'parking',
		label: 'Parking',
		amenity: 'parking',
		fields: [
			{
				key: 'parking',
				label: 'Type',
				options: [
					{ value: 'street_side', label: 'Street side' },
					{ value: 'surface', label: 'Parking lot' },
					{ value: 'multi-storey', label: 'Multi-storey' },
					{ value: 'underground', label: 'Underground' },
					{ value: 'rooftop', label: 'Rooftop' }
				]
			},
			fee,
			{
				key: 'access',
				label: 'Access',
				options: [
					{ value: 'yes', label: 'Public' },
					{ value: 'customers', label: 'Customers' },
					{ value: 'private', label: 'Private' }
				]
			},
			{ key: 'capacity', label: 'Spaces', placeholder: 'Number of spaces' },
			name
		] satisfies Field[]
	},
	{
		id: 'charging-station',
		label: 'Charging station',
		amenity: 'charging_station',
		fields: [
			{ key: 'capacity', label: 'Charging points', placeholder: 'Number of points' },
			fee,
			operator,
			name
		] satisfies Field[]
	},
	{
		id: 'car-wash',
		label: 'Car wash',
		amenity: 'car_wash',
		fields: [
			{ key: 'self_service', label: 'Self service', options: yesNo },
			{ key: 'automated', label: 'Automated', options: yesNo },
			fee,
			name
		] satisfies Field[]
	}
] as const;

export type AmenityId = (typeof amenityFeatures)[number]['id'];

export function amenityFeatureOf(tags: Record<string, string>) {
	return amenityFeatures.find((f) => f.amenity === tags.amenity);
}

/** Free text shared by every editable feature; becomes the OSM note for mappers. */
export const noteField: Field = { key: 'note', label: 'Note' };

/** The details that can be edited for a marker with these tags; none if it has no editor. */
export function fieldsOf(tags: Record<string, string>): Field[] {
	const feature = amenityFeatureOf(tags);
	return feature ? [...feature.fields, noteField] : [];
}

/** The filled-in details as short text, e.g. "Multi-storey · Fee: Yes"; empty if there are none. */
export function describeDetails(tags: Record<string, string>): string {
	return fieldsOf(tags)
		.filter((f) => f.key !== 'name' && tags[f.key])
		.map((f) => {
			const shown = f.options?.find((o) => o.value === tags[f.key])?.label ?? tags[f.key];
			return f.key === 'parking' ? shown : `${f.label}: ${shown}`;
		})
		.join(' · ');
}

// Planned: petrol station (amenity=fuel).
