/* eslint-disable @typescript-eslint/no-explicit-any */

export type Patch = {
	op: 'replace' | 'add' | 'remove';
	path: (string | number)[]; // The path to the key being changed
	value?: any; // The new value (only for "replace" and "add")
};

export function generatePatches(prevState: any, nextState: any): Patch[] {
	const patches: Patch[] = [];

	function deepDiff(path: (string | number)[], oldValue: any, newValue: any) {
		if (Array.isArray(oldValue) && Array.isArray(newValue)) {
			// If arrays are entirely different, replace them instead of diffing
			if (
				oldValue.length !== newValue.length ||
				!oldValue.every((val, i) => val === newValue[i])
			) {
				patches.push({ op: 'replace', path, value: newValue });
				return;
			}
		} else if (
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
