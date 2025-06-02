import { describe, expect, it } from 'vitest';
import { SYNC_KEY } from '../constants';
import { isProxyReadySync } from '../main';
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

describe('isProxyReadySync', () => {
	it('should throw error if store is not a proxy store', () => {
		expect(() => isProxyReadySync(getStore())).toThrow('Store is not a proxy');
	});

	it('should return true if store is synced already ', () => {
		const store = getStore({ [SYNC_KEY]: true });
		expect(isProxyReadySync(store)).toBe(true);
	});

	it('should return false if store is not synced', () => {
		const store = getStore({ [SYNC_KEY]: false });
		expect(isProxyReadySync(store)).toBe(false);
	});
});
