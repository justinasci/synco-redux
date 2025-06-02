import { type Store } from '@reduxjs/toolkit';
import { IProxyComms } from '../IProxyComms';
import type Browser from 'webextension-polyfill';
import { SYNCO_PORT_ID } from '../../constants';
import {
	isSyncMessage,
	PATCH_STATE,
	SYNC_GLOBAL,
	SyncMessage,
	syncMessage
} from '../../syncMessage';
import { applyPatch, syncGlobal } from '../../proxyStore/proxyReducer';
import { isProxyReadySync } from '../../proxyStore/isProxyReadySync';
import { IntervalTimer } from '../../utils/IntervalTimer';

export class PortProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;
	syncIntervalTimer: IntervalTimer | undefined;

	constructor(private browser: typeof Browser) {}

	private openPort = () => {
		return this.browser.runtime.connect({ name: SYNCO_PORT_ID });
	};

	connect = () => {
		if (this.port) {
			if (this.port.error) {
				this.port.disconnect();
			} else {
				return;
			}
		}

		this.port = this.openPort();

		if (!this.port) {
			return;
		}

		this.port.onDisconnect.addListener(() => {
			this.port?.disconnect();
			this.port = undefined;
		});
	};

	init = (store: Store) => {
		if (!this.port) {
			this.connect();
		}

		if (!this.port) {
			return;
		}

		this.port.onMessage.addListener((message) => {
			if (!isSyncMessage(message)) {
				return;
			}

			this.handleMessage(store, message as SyncMessage);
		});

		this.postMessage(syncMessage());

		this.syncIntervalTimer = new IntervalTimer(() => {
			if (isProxyReadySync(store)) {
				this.syncIntervalTimer?.stop();
				return;
			}
			this.postMessage(syncMessage());
		}, 500);
	};

	postMessage = (message: unknown) => {
		if (!this.getIsPortValid()) {
			this.connect();
		}
		this.port?.postMessage(message);
	};

	handleMessage = (store: Store, message: SyncMessage) => {
		if (message.type === PATCH_STATE) {
			store.dispatch(applyPatch(message.patches));
		} else if (message.type === SYNC_GLOBAL) {
			store.dispatch(syncGlobal(message.state as never));
		}
	};

	private getIsPortValid = () => {
		return this.port && !this.port.error;
	};
}
