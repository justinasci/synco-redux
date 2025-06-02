import { Store } from '@reduxjs/toolkit';
import { isProxyStore } from './isProxyStore';
import { SYNC_KEY } from '../constants';

/**
 * Check if the proxy store is ready synchronously
 * @param proxyStore - The proxy store
 * @returns True if the proxy store is ready, false otherwise
 */
export const isProxyReadySync = <S extends Store>(
	proxyStore: S
): boolean | undefined => {
	if (!isProxyStore(proxyStore)) {
		throw new Error('Store is not a proxy');
	}

	return !!proxyStore.getState()[SYNC_KEY];
};
