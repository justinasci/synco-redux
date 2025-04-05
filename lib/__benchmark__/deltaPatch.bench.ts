import { bench, describe } from 'vitest';
import { applyChanges, generateBenchObject } from './data';
import {
	APPLY_PATCH_ACTION,
	immerProxyStoreReducer,
	proxyReducer
} from '../proxyStore/proxyReducer';
import { generatePatches } from '../mainStore/patchGenerator';
import {
	applyPatches,
	createDraft,
	enablePatches,
	finishDraft,
	Patch
} from 'immer';

describe('generate patches and restore', () => {
	enablePatches();

	// skip becouse reference tracking is broken
	bench.skip('synco delta + synco patcher', () => {
		const old = generateBenchObject();
		const newObject = applyChanges(old);

		const patched = generatePatches(old, newObject);

		proxyReducer(old, {
			type: APPLY_PATCH_ACTION,
			payload: patched
		});
	});

	bench('synco delta + immer patcher', () => {
		const old = generateBenchObject();
		const newObject = applyChanges(old);

		const patched = generatePatches(old, newObject);

		immerProxyStoreReducer(old, {
			type: APPLY_PATCH_ACTION,
			//@ts-expect-error expected payload
			payload: patched
		});
	});

	bench('immer delta + immer patcher', () => {
		const old = generateBenchObject();
		const newObject = createDraft(old);
		applyChanges(newObject);

		let patches: Patch[] = [];

		finishDraft(newObject, (p) => {
			patches = p;
		});

		applyPatches(old, patches);
	});
});
