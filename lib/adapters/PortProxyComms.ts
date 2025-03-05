import { Store } from '@reduxjs/toolkit';
import { IProxyComms } from './IProxyComms';
import Browser from 'webextension-polyfill';
import { SYNCO_PORT_ID } from '../constants';
import {
	isSyncMessage,
	PATCH_STATE,
	SYNC_GLOBAL,
	SyncMessage,
	syncMessage
} from '../SyncMessage';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';

export class BrowserExtensionProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;

	connect = () => {
		this.port = Browser.runtime.connect({ name: SYNCO_PORT_ID });
	};

	init = (store: Store) => {
		if (!this.port) {
			this.port = Browser.runtime.connect({ name: SYNCO_PORT_ID });
		}

		this.port.onMessage.addListener((message) => {
			if (!isSyncMessage(message)) {
				return;
			}

			this.handleMessage(store, message as SyncMessage);
		});

		this.postMessage(syncMessage());
	};

	postMessage = (message: unknown) => {
		this.port?.postMessage(message);
	};

	handleMessage = (store: Store, message: SyncMessage) => {
		if (message.type === PATCH_STATE) {
			store.dispatch(applyPatch(message.patches));
		} else if (message.type === SYNC_GLOBAL) {
			store.dispatch(syncGlobal(message.state as never));
		}
	};
}
