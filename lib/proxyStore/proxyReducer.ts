import { Action } from '@reduxjs/toolkit';
import { type Patch } from '../mainStore/patchGenerator';
import { initialState, ProxyState } from './proxyStore';
import { produce } from 'immer';
import { SYNC_KEY } from '../constants';

export const APPLY_PATCH_ACTION = 'proxyStore/applyPatch' as const;
export const SYNC_GLOBAL_ACTION = 'proxyStore/syncGlobal' as const;

// Patches arrive from another process over the port/IPC channel, so every path
// segment is untrusted input. Walking or writing through these keys would reach
// Object.prototype and let a sender tamper with every object in the app.
const UNSAFE_PATH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const isSafePath = (path: (string | number)[]): boolean =>
	path.every((key) => !UNSAFE_PATH_KEYS.has(String(key)));

export const applyPatch = (patches: Patch[]) => ({
	type: APPLY_PATCH_ACTION,
	payload: patches
});

export const syncGlobal = (newState: { [key: string]: unknown }) => ({
	type: SYNC_GLOBAL_ACTION,
	payload: newState
});

export const immerProxyStoreReducer = <T>(
	state: T = initialState as T,
	action: Action
): T => {
	if (!('payload' in action)) {
		return state;
	}

	if (action.type === SYNC_GLOBAL_ACTION) {
		const newState = {
			...(action.payload as Record<string, unknown>),
			[SYNC_KEY]: true
		};
		return newState as T;
	}

	if (action.type === APPLY_PATCH_ACTION) {
		// An empty path targets the root itself, which cannot be expressed by
		// mutating a draft: assigning would write a key literally named
		// "undefined" onto the existing state instead of replacing it.
		const rootPatch = (action.payload as Patch[]).find(
			(patch) => patch.path.length === 0
		);

		if (rootPatch) {
			return rootPatch.value as T;
		}
	}

	return produce(state as T & ProxyState, (draft) => {
		switch (action.type) {
			case APPLY_PATCH_ACTION: {
				const patches = action.payload as Patch[];

				patches.forEach((patch) => {
					const { op, path, value } = patch;

					if (path.length === 0 || !isSafePath(path)) {
						return;
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let target: any = draft;

					// Traverse the path except for the last key
					for (let i = 0; i < path.length - 1; i++) {
						target = target[path[i] as keyof typeof target];

						if (target === null || typeof target !== 'object') {
							return;
						}
					}

					const lastKey = path[path.length - 1] as keyof typeof target;

					switch (op) {
						case 'replace':
						case 'add':
							target[lastKey] = value;
							break;

						case 'remove':
							if (Array.isArray(target)) {
								target.splice(Number(lastKey), 1); // Handle arrays
							} else {
								delete target[lastKey];
							}
							break;

						default:
							break;
					}
				});

				break;
			}

			default:
				break;
		}
	});
};
