import { isProxyStore } from './isProxyStore';
import { SYNC_KEY } from '../constants';
import { Store } from '@reduxjs/toolkit';

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

export const isProxyReadySync = <S extends Store>(proxyStore: S) => {
	if (!isProxyStore(proxyStore)) {
		return false;
	}

	return proxyStore.getState()[SYNC_KEY];
};
