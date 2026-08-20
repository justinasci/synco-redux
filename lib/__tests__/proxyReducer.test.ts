import { afterEach, describe, it, expect } from 'vitest';
import {
	applyPatch,
	immerProxyStoreReducer,
	syncGlobal
} from '../proxyStore/proxyReducer';
import { SYNC_KEY } from '../constants';
import { ProxyState } from '../proxyStore/proxyStore';

describe('immerProxyStoreReducer', () => {
	describe('SYNC_GLOBAL_ACTION', () => {
		it('should completely replace state on sync', () => {
			const initialState: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				count: 1,
				nested: { value: 'old' },
				[SYNC_KEY]: false
			};

			const newState: Record<string, unknown> = {
				hello: 'world',
				count: 2
			};

			const result = immerProxyStoreReducer(initialState, syncGlobal(newState));

			// Should only contain new state properties plus SYNC_KEY
			expect(Object.keys(result).sort()).toEqual(
				['hello', 'count', SYNC_KEY].sort()
			);
			expect(result).toEqual({
				hello: 'world',
				count: 2,
				[SYNC_KEY]: true
			});
		});

		it('should handle multiple sync operations correctly', () => {
			const initialState: Record<string, unknown> & ProxyState = {
				initial: 'value',
				[SYNC_KEY]: false
			};

			// First sync
			const firstSync: Record<string, unknown> = {
				foo: 'bar',
				count: 1
			};

			let result = immerProxyStoreReducer(initialState, syncGlobal(firstSync));

			expect(result).toEqual({
				foo: 'bar',
				count: 1,
				[SYNC_KEY]: true
			});

			// Second sync with different data
			const secondSync: Record<string, unknown> = {
				hello: 'world',
				newValue: true
			};

			result = immerProxyStoreReducer(result, syncGlobal(secondSync));

			// Should completely replace previous sync state
			expect(result).toEqual({
				hello: 'world',
				newValue: true,
				[SYNC_KEY]: true
			});

			// Verify no remnants of previous states exist
			expect((result as any).foo).toBeUndefined();
			expect((result as any).count).toBeUndefined();
			expect((result as any).initial).toBeUndefined();
		});

		it('should handle empty sync state', () => {
			const initialState: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: false
			};

			const result = immerProxyStoreReducer(initialState, syncGlobal({}));

			expect(result).toEqual({
				[SYNC_KEY]: true
			});
		});

		it('should preserve SYNC_KEY even if provided in payload', () => {
			const initialState: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: false
			};

			const result = immerProxyStoreReducer(
				initialState,
				syncGlobal({
					[SYNC_KEY]: false
				})
			);

			expect(result[SYNC_KEY]).toBe(true); // Should always be true after sync
		});
	});

	describe('APPLY_PATCH_ACTION', () => {
		it('should replace the whole state when the patch path is empty', () => {
			const initialState: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: true
			};

			const result = immerProxyStoreReducer(
				initialState,
				applyPatch([{ op: 'replace', path: [], value: { baz: 'qux' } }])
			);

			expect(result).toEqual({ baz: 'qux' });
		});
	});
	describe('APPLY_PATCH_ACTION prototype pollution', () => {
		afterEach(() => {
			// Undo pollution so a failure here cannot cascade into other tests
			delete (Object.prototype as Record<string, unknown>).polluted;
		});

		it('should not pollute Object.prototype through a __proto__ path', () => {
			const state: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: true
			};

			immerProxyStoreReducer(
				state,
				applyPatch([{ op: 'add', path: ['__proto__', 'polluted'], value: 'yes' }])
			);

			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
			expect(Object.prototype).not.toHaveProperty('polluted');
		});

		it('should not pollute Object.prototype through a constructor.prototype path', () => {
			const state: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: true
			};

			immerProxyStoreReducer(
				state,
				applyPatch([
					{
						op: 'add',
						path: ['constructor', 'prototype', 'polluted'],
						value: 'yes'
					}
				])
			);

			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
			expect(Object.prototype).not.toHaveProperty('polluted');
		});

		it('should not delete inherited properties through a __proto__ path', () => {
			(Object.prototype as Record<string, unknown>).polluted = 'preexisting';

			const state: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: true
			};

			immerProxyStoreReducer(
				state,
				applyPatch([{ op: 'remove', path: ['__proto__', 'polluted'] }])
			);

			expect(Object.prototype).toHaveProperty('polluted');
		});

		it('should still apply legitimate patches', () => {
			const state: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				nested: { count: 1 },
				list: [1, 2, 3],
				[SYNC_KEY]: true
			};

			const result = immerProxyStoreReducer(
				state,
				applyPatch([
					{ op: 'replace', path: ['foo'], value: 'baz' },
					{ op: 'add', path: ['nested', 'added'], value: true },
					{ op: 'remove', path: ['list', 1] }
				])
			);

			expect(result.foo).toBe('baz');
			expect(result.nested).toEqual({ count: 1, added: true });
			expect(result.list).toEqual([1, 3]);
		});

		it('should drop only the unsafe patch and keep the rest', () => {
			const state: Record<string, unknown> & ProxyState = {
				foo: 'bar',
				[SYNC_KEY]: true
			};

			const result = immerProxyStoreReducer(
				state,
				applyPatch([
					{ op: 'add', path: ['__proto__', 'polluted'], value: 'yes' },
					{ op: 'replace', path: ['foo'], value: 'baz' }
				])
			);

			expect(result.foo).toBe('baz');
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});
	});
});
