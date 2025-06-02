import { Store } from '@reduxjs/toolkit';
import { SYNC_KEY } from '../constants';

/**
 * Check if the store is a proxy store
 * @param store - The store
 * @returns True if the store is a proxy store, false otherwise
 */
export const isProxyStore = <S extends Store>(store: S) => {
	return Object.prototype.hasOwnProperty.call(store.getState(), SYNC_KEY);
};
