import { bench, describe } from 'vitest';
import { applyChanges, generateBenchObject } from './data';
import { APPLY_PATCH_ACTION, proxyReducer } from '../proxyStore/proxyReducer';
import { generatePatches } from '../mainStore/patchGenerator';
import { applyPatches, enablePatches } from 'immer';

const old = generateBenchObject();
const patched = generatePatches(old, applyChanges(generateBenchObject()));

describe('generate state from patches', () => {
	enablePatches();

	bench('synco patcher', () => {
		proxyReducer(old, {
			type: APPLY_PATCH_ACTION,
			payload: patched
		});
	});

	bench('immer patcher', () => {
		applyPatches(old, patched);
	});
});
