import { type Store } from '@reduxjs/toolkit';
import { SYNC_KEY } from '../constants';

export const isProxyStore = (store: Store) => {
	return Object.prototype.hasOwnProperty.call(store.getState(), SYNC_KEY);
};
