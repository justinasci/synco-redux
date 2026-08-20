/* eslint-disable @typescript-eslint/no-explicit-any */

export type Patch = {
	op: 'replace' | 'add' | 'remove';
	path: (string | number)[]; // The path to the key being changed
	value?: any; // The new value (only for "replace" and "add")
};

export function generatePatches(prevState: any, nextState: any): Patch[] {
	const patches: Patch[] = [];

	function deepDiff(path: (string | number)[], oldValue: any, newValue: any) {
		const oldIsArray = Array.isArray(oldValue);
		const newIsArray = Array.isArray(newValue);

		if (oldIsArray || newIsArray) {
			// Arrays are replaced wholesale instead of diffed. A change between
			// array and non-array is a replace as well: both are `typeof
			// 'object'`, so diffing them key-wise would emit patches that leave
			// the target with the wrong type.
			if (
				oldIsArray !== newIsArray ||
				oldValue.length !== newValue.length ||
				!oldValue.every((val: unknown, i: number) => val === newValue[i])
			) {
				patches.push({ op: 'replace', path, value: newValue });
			}
			return;
		}

		if (
			typeof oldValue === 'object' &&
			typeof newValue === 'object' &&
			oldValue !== null &&
			newValue !== null
		) {
			// Recursively check object properties
			for (const key in oldValue) {
				if (!(key in newValue)) {
					patches.push({ op: 'remove', path: [...path, key] });
				}
			}
			for (const key in newValue) {
				if (!(key in oldValue)) {
					patches.push({
						op: 'add',
						path: [...path, key],
						value: newValue[key]
					});
				} else if (oldValue[key] !== newValue[key]) {
					deepDiff([...path, key], oldValue[key], newValue[key]);
				}
			}
		} else if (oldValue !== newValue) {
			patches.push({ op: 'replace', path, value: newValue });
		}
	}

	deepDiff([], prevState, nextState);
	return patches;
}
