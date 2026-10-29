import type { StyleSpecification } from 'maplibre-gl';

export interface Basemap {
	id: string;
	label: string;
	/** A style URL (vector styles carry their own attribution) or an inline style. */
	style: string | StyleSpecification;
}

function rasterStyle(tiles: string[], attribution: string, maxzoom: number): StyleSpecification {
	return {
		version: 8,
		sources: { base: { type: 'raster', tiles, tileSize: 256, maxzoom, attribution } },
		layers: [{ id: 'base', type: 'raster', source: 'base' }]
	};
}

const OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Keyless public basemaps: no account, API key or hosting on our side. */
export const basemaps: Basemap[] = [
	// Vector styles from OpenFreeMap, with a clear road hierarchy that suits driving.
	{ id: 'liberty', label: 'Roads & places', style: 'https://tiles.openfreemap.org/styles/liberty' },
	{ id: 'bright', label: 'Roads (bright)', style: 'https://tiles.openfreemap.org/styles/bright' },
	{ id: 'positron', label: 'Light', style: 'https://tiles.openfreemap.org/styles/positron' },
	{
		id: 'osm',
		label: 'OpenStreetMap',
		style: rasterStyle(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], OSM, 19)
	},
	{
		// Esri World Imagery is keyless and permitted for tracing and editing OpenStreetMap.
		id: 'satellite',
		label: 'Satellite',
		style: rasterStyle(
			[
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
			],
			'Tiles © <a href="https://www.esri.com">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
			19
		)
	},
	{
		id: 'topo',
		label: 'Topographic',
		style: rasterStyle(
			['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
			`${OSM}, © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
			17
		)
	}
];

export const DEFAULT_BASEMAP = 'liberty';

/** The basemap with this id, or the default if unknown (e.g. a stale stored setting). */
export function getBasemap(id: string): Basemap {
	return basemaps.find((b) => b.id === id) ?? basemaps.find((b) => b.id === DEFAULT_BASEMAP)!;
}
