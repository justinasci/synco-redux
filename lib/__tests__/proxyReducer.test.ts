import { describe, it, expect } from 'vitest';
import { immerProxyStoreReducer, syncGlobal } from '../proxyStore/proxyReducer';
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
					[SYNC_KEY]: false as never
				})
			);

			expect(result[SYNC_KEY]).toBe(true); // Should always be true after sync
		});
	});
});
