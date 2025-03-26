import { Store } from '@reduxjs/toolkit';
import { SYNC_KEY } from '../constants';

export const isProxyStore = <S extends Store>(store: S) => {
	return Object.prototype.hasOwnProperty.call(store.getState(), SYNC_KEY);
};
