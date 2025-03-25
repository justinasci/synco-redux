import { type Store } from '@reduxjs/toolkit';
import { type IProxyComms } from './IProxyComms';

import { SYNCO_ELECTRON_API_KEY, SYNCO_PORT_ID } from '../constants';
import {
	isSyncMessage,
	PATCH_STATE,
	SYNC_GLOBAL,
	SyncMessage,
	syncMessage
} from '../SyncMessage';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';

const API = SYNCO_ELECTRON_API_KEY;

export class ElectronProxyComms implements IProxyComms {
	connect = () => {};

	init = (store: Store) => {
		if (!window[API]) {
			throw new Error(
				'Synco-redux api is not exposed in window object. Please add registerSyncoReduxContextBridge to your preload script'
			);
		}

		window[API].onMessage(SYNCO_PORT_ID, (_event, message) => {
			if (!isSyncMessage(message)) {
				return;
			}
			this.handleMessage(store, message as SyncMessage);
		});

		window[API].sendMessage(SYNCO_PORT_ID, syncMessage());
	};

	postMessage = (message: unknown) => {
		window[API].sendMessage(SYNCO_PORT_ID, message);
	};

	private handleMessage = (store: Store, message: SyncMessage) => {
		if (message.type === PATCH_STATE) {
			store.dispatch(applyPatch(message.patches));
		} else if (message.type === SYNC_GLOBAL) {
			store.dispatch(syncGlobal(message.state as never));
		}
	};
}
