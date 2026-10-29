import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { getCategory } from '../lib/categories';
import { settings } from '../lib/settings.svelte';

// The app opens straight into the default category, ready to record.
export function load() {
	redirect(307, resolve(getCategory(settings.defaultCategory).path));
}
