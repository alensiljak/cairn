// App-styled replacement for window.confirm(). Render <ConfirmDialog /> once in the layout.

export const dialog = $state({ open: false, message: '', confirmLabel: 'Delete' });

let resolver: ((ok: boolean) => void) | undefined;

/** Ask the user to confirm; resolves to true only if they pick the confirm button. */
export function confirmDialog(message: string, confirmLabel = 'Delete'): Promise<boolean> {
	resolver?.(false);
	dialog.message = message;
	dialog.confirmLabel = confirmLabel;
	dialog.open = true;
	return new Promise((resolve) => (resolver = resolve));
}

export function answer(ok: boolean) {
	dialog.open = false;
	resolver?.(ok);
	resolver = undefined;
}
