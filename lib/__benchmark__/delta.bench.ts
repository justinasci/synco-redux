import { bench, describe } from 'vitest';
import { generatePatches } from '../mainStore/patchGenerator';
import { createDraft, enablePatches, finishDraft } from 'immer';
import { applyChanges, generateBenchObject } from './data';

describe('generate patches', () => {
	enablePatches();

	const old = generateBenchObject();

	bench('synco delta', () => {
		const newObject = generateBenchObject();
		applyChanges(newObject);
		generatePatches(old, newObject);
	});

	bench('immer delta', () => {
		const old = generateBenchObject();
		const newObject = createDraft(old);
		applyChanges(newObject);

		finishDraft(newObject, () => {});
	});
});
