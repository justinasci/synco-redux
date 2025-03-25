import { type Store } from '@reduxjs/toolkit';
import { IProxyComms } from './IProxyComms';
import type Browser from 'webextension-polyfill';
import { SYNCO_PORT_ID } from '../constants';
import {
	isSyncMessage,
	PATCH_STATE,
	SYNC_GLOBAL,
	SyncMessage,
	syncMessage
} from '../SyncMessage';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';

export class PortProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;

	constructor(private browser: typeof Browser) {}

	connect = () => {
		this.port = this.browser.runtime.connect({ name: SYNCO_PORT_ID });
	};

	init = (store: Store) => {
		if (!this.port) {
			this.port = this.browser.runtime.connect({ name: SYNCO_PORT_ID });
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
