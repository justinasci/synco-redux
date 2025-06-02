import { isProxyStore } from './isProxyStore';
import { Store } from '@reduxjs/toolkit';
import { isProxyReadySync } from '../main';

/**
 * Check if the proxy store is ready asynchronously
 * @param proxyStore - The proxy store
 * @returns True if the proxy store is ready, false otherwise
 */
export const isProxyReady = <S extends Store>(proxyStore: S) => {
	if (!isProxyStore(proxyStore)) {
		return Promise.reject(new Error('Store is not a proxy'));
	}

	if (isProxyReadySync(proxyStore)) {
		return Promise.resolve(true);
	}

	return new Promise<boolean>((resolve) => {
		const unsubscribe = proxyStore.subscribe(() => {
			if (isProxyReadySync(proxyStore)) {
				unsubscribe();
				resolve(true);
			}
		});
	});
};
