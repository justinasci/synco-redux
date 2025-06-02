import { describe, expect, it } from 'vitest';
import { isProxyReady } from '../main';
import { SYNC_KEY } from '../constants';
import { configureStore } from '@reduxjs/toolkit';

const getStore = (preloadedState = {}) =>
	configureStore({
		reducer: (state, action) => {
			if (action.type === 'update') {
				return action.payload;
			}

			return state;
		},
		preloadedState
	});

describe('isProxyReady', () => {
	it('should throw error if store is not a proxy store', async () => {
		await expect(isProxyReady(getStore())).rejects.toThrow(
			'Store is not a proxy'
		);
	});

	it('shoud return true if store is synced already ', async () => {
		const promise = await isProxyReady(getStore({ [SYNC_KEY]: true }));
		expect(promise).toBe(true);
	});

	it('shoud wait for store to get synced and resolve true', async () => {
		const store = getStore({ [SYNC_KEY]: false });
		const promise = isProxyReady(store);

		store.dispatch({ type: 'update', payload: { [SYNC_KEY]: true } });
		expect(await promise).toBe(true);
	});
});

