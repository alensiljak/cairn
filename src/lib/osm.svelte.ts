// OpenStreetMap OAuth 2 (authorization code with PKCE; a static app has no place to keep a client
// secret) and the notes API.
//
// Register an OAuth 2 application at <OSM>/oauth2/applications with the `write_notes` permission,
// "confidential application" unchecked, and `<origin>/oauth/callback` as redirect URI. Its client
// id goes into VITE_OSM_CLIENT_ID. VITE_OSM_URL points at another OSM server, e.g. the development
// instance https://master.apis.dev.openstreetmap.org, so tests don't create real notes.

const OSM_URL: string = (import.meta.env.VITE_OSM_URL ?? 'https://www.openstreetmap.org').replace(
	/\/$/,
	''
);
const CLIENT_ID: string | undefined = import.meta.env.VITE_OSM_CLIENT_ID || undefined;

const TOKEN_KEY = 'cairn.osm-token';
const FLOW_KEY = 'cairn.osm-flow';

export const osmUrl = OSM_URL;
/** False when the build has no client id; connecting is impossible then. */
export const osmConfigured = CLIENT_ID !== undefined;

function loadToken(): string | undefined {
	try {
		return localStorage.getItem(TOKEN_KEY) ?? undefined;
	} catch {
		return undefined;
	}
}

export const osm = $state({ token: loadToken() });

function setToken(token: string | undefined) {
	osm.token = token;
	try {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
	} catch {
		// Storage unavailable (private mode): the login lasts for this session only.
	}
}

export class NotAuthorizedError extends Error {
	constructor() {
		super('Not signed in to OpenStreetMap.');
	}
}

const redirectUri = () => `${location.origin}/oauth/callback`;

function base64url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

function randomString(): string {
	return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Sends the user to OSM to authorize; they come back to /oauth/callback, then to `returnTo`. */
export async function login(returnTo: string = location.pathname): Promise<void> {
	if (!CLIENT_ID) throw new Error('This build has no OpenStreetMap client id.');
	const verifier = randomString();
	const state = randomString();
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	sessionStorage.setItem(FLOW_KEY, JSON.stringify({ verifier, state, returnTo }));
	const url = new URL(`${OSM_URL}/oauth2/authorize`);
	url.search = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: redirectUri(),
		response_type: 'code',
		scope: 'write_notes',
		state,
		code_challenge: base64url(new Uint8Array(digest)),
		code_challenge_method: 'S256'
	}).toString();
	location.assign(url);
}

/** Completes the login on the redirect back from OSM; resolves to the page to return to. */
export async function completeLogin(params: URLSearchParams): Promise<string> {
	const raw = sessionStorage.getItem(FLOW_KEY);
	sessionStorage.removeItem(FLOW_KEY);
	if (!raw || !CLIENT_ID) throw new Error('No sign-in in progress.');
	const flow = JSON.parse(raw) as { verifier: string; state: string; returnTo: string };

	const denied = params.get('error_description') ?? params.get('error');
	if (denied) throw new Error(denied);
	const code = params.get('code');
	if (!code || params.get('state') !== flow.state) throw new Error('Invalid sign-in response.');

	const res = await fetch(`${OSM_URL}/oauth2/token`, {
		method: 'POST',
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri(),
			client_id: CLIENT_ID,
			code_verifier: flow.verifier
		})
	});
	if (!res.ok) throw new Error(`OpenStreetMap refused the sign-in (${res.status}).`);
	const { access_token } = (await res.json()) as { access_token: string };
	setToken(access_token);
	return flow.returnTo;
}

export function logout() {
	setToken(undefined);
}

/** Creates an OSM note and returns its id. */
export async function createNote(lat: number, lon: number, text: string): Promise<number> {
	if (!osm.token) throw new NotAuthorizedError();
	const res = await fetch(`${OSM_URL}/api/0.6/notes.json`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${osm.token}` },
		body: new URLSearchParams({ lat: String(lat), lon: String(lon), text })
	});
	if (res.status === 401) {
		// Revoked or otherwise invalid: forget it so the next attempt signs in again.
		setToken(undefined);
		throw new NotAuthorizedError();
	}
	if (!res.ok) throw new Error(`OpenStreetMap rejected the note (${res.status}).`);
	const note = (await res.json()) as { properties: { id: number } };
	return note.properties.id;
}
