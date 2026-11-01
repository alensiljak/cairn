// Marker storage in IndexedDB.
//
// Coordinates are flat numeric fields (lon/lat, WGS84) rather than nested in the payload:
// they can be indexed and converted to GeoJSON (see `toFeature`) for MapLibre without parsing.
// What was mapped is stored as real OSM tags (e.g. traffic_sign=maxspeed, maxspeed=50), so
// export/upload needs no translation and new categories need no schema change.

export interface Marker {
	id?: number;
	/** OSM tags of the node to create. */
	tags: Record<string, string>;
	/** Null for a voice note recorded without a position fix. */
	lon: number | null;
	lat: number | null;
	/** Horizontal accuracy in metres. */
	accuracy: number | null;
	/** Direction of travel in degrees from north. */
	heading: number | null;
	/** Device speed in m/s. */
	speed: number | null;
	/** Voice note recording, to be transcribed into a `note` tag later. Not part of the OSM data. */
	audio?: Blob;
	/** Epoch milliseconds. */
	createdAt: number;
	/** When it was uploaded to OSM as a note (epoch milliseconds); kept until purged. */
	uploadedAt?: number;
	/** Id of the OSM note it became. */
	noteId?: number;
}

export type NewMarker = Omit<Marker, 'id' | 'createdAt'>;

const DB_NAME = 'cairn';
const STORE = 'markers';

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
	dbPromise ??= new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 2);
		req.onupgradeneeded = (event) => {
			const db = req.result;
			const tx = req.transaction!;
			if (event.oldVersion < 1) {
				const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
				store.createIndex('createdAt', 'createdAt');
			}
			if (event.oldVersion === 1) {
				// v1 stored { type, value }; v2 stores OSM tags.
				const store = tx.objectStore(STORE);
				store.deleteIndex('type');
				store.openCursor().onsuccess = (e) => {
					const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
					if (!cursor) return;
					const { type, value, ...rest } = cursor.value;
					cursor.update({ ...rest, tags: { traffic_sign: type, [type]: value } });
					cursor.continue();
				};
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function addMarker(marker: NewMarker): Promise<number> {
	const db = await openDb();
	const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
	return (await request(store.add({ ...marker, createdAt: Date.now() }))) as number;
}

/** All markers, newest first. */
export async function listMarkers(): Promise<Marker[]> {
	const db = await openDb();
	const all = await request(db.transaction(STORE).objectStore(STORE).getAll());
	return (all as Marker[]).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteMarker(id: number): Promise<void> {
	const db = await openDb();
	await request(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
}

export async function markUploaded(id: number, noteId: number, uploadedAt: number): Promise<void> {
	const db = await openDb();
	const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
	const marker = (await request(store.get(id))) as Marker | undefined;
	if (!marker) return;
	await request(store.put({ ...marker, noteId, uploadedAt }));
}

/** Deletes every uploaded marker; returns how many. */
export async function purgeUploaded(): Promise<number> {
	const db = await openDb();
	const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
	const uploaded = ((await request(store.getAll())) as Marker[]).filter((m) => m.uploadedAt);
	await Promise.all(uploaded.map((m) => request(store.delete(m.id!))));
	return uploaded.length;
}

/** Sets a new position; the accuracy/heading/speed of the original fix no longer apply. */
export async function moveMarker(id: number, lon: number, lat: number): Promise<void> {
	const db = await openDb();
	const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
	const marker = (await request(store.get(id))) as Marker | undefined;
	if (!marker) return;
	await request(store.put({ ...marker, lon, lat, accuracy: null, heading: null, speed: null }));
}

/** GeoJSON Point feature (note: GeoJSON order is [lon, lat]); null geometry without a position. */
export function toFeature(m: Marker) {
	return {
		type: 'Feature' as const,
		geometry:
			m.lon !== null && m.lat !== null
				? { type: 'Point' as const, coordinates: [m.lon, m.lat] }
				: null,
		properties: { ...m.tags }
	};
}
