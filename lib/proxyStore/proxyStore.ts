import { type StoreEnhancer } from '@reduxjs/toolkit';

import { SYNC_KEY } from '../constants';
import { dispatchMesssage } from '../SyncMessage';
import { APPLY_PATCH_ACTION, SYNC_GLOBAL_ACTION } from './proxyReducer';
import { IProxyComms } from '../adapters/IProxyComms';
import { BrowserExtensionProxyComms } from '../adapters/BrowserExtensionProxyComms';

export interface ProxyState {
	[SYNC_KEY]: boolean;
	[key: string]: unknown;
}

export const initialState: ProxyState = {
	isStateSynced: false
};

export const createProxyStoreEnhancer = (
	comms: IProxyComms = new BrowserExtensionProxyComms()
): StoreEnhancer => {
	comms.connect();

	const enhancer: StoreEnhancer = (createStore) => (reducers, initalState) => {
		const store = createStore(reducers, initalState);
		const originalDispatch = store.dispatch;

		store.dispatch = (action) => {
			if (
				(<string[]>[APPLY_PATCH_ACTION, SYNC_GLOBAL_ACTION]).includes(
					action.type
				)
			) {
				return originalDispatch(action);
			}

			comms.postMessage(dispatchMesssage(action));
			return action;
		};

		comms.init(store);

		return store;
	};

	return enhancer;
};
