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
import { ILogger } from '../ILogger';
import { isProxyReadySync } from '../proxyStore/isProxyReady';
import { IntervalTimer } from '../utils/IntervalTimer';

export class PortProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;
	syncIntervalTimer: IntervalTimer | undefined;

	constructor(
		private browser: typeof Browser,
		private logger?: ILogger
	) {}

	private openPort = () => {
		return this.browser.runtime.connect({ name: SYNCO_PORT_ID });
	};

	connect = () => {
		if (this.port) {
			if (this.port.error) {
				this.logger?.error('Port error: ', this.port.error);
				this.port.disconnect();
			} else {
				return;
			}
		}

		this.port = this.openPort();

		if (!this.port) {
			this.logger?.error('Failed to connect to port');
			return;
		}

		this.logger?.log('Connected to port: ', this.port.name);

		this.port.onDisconnect.addListener(() => {
			this.logger?.log('Disconnected from port: ', this.port?.name);
			this.port?.disconnect();
			this.port = undefined;
		});
	};

	init = (store: Store) => {
		if (!this.port) {
			this.connect();
		}

		if (!this.port) {
			this.logger?.error('Failed to initialize port proxy comms');
			return;
		}

		this.port.onMessage.addListener((message) => {
			if (!isSyncMessage(message)) {
				return;
			}

			this.handleMessage(store, message as SyncMessage);
		});

		this.logger?.log('Posting message: Sync global state');
		this.postMessage(syncMessage());

		this.syncIntervalTimer = new IntervalTimer(() => {
			if (isProxyReadySync(store)) {
				this.logger?.log('Proxy synced with retry');
				this.syncIntervalTimer?.stop();
				return;
			}

			this.logger?.log('Retrying Posting message: Sync global state');
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
			this.logger?.log('Received message: Sync global state');
			store.dispatch(syncGlobal(message.state as never));
		}
	};

	private getIsPortValid = () => {
		return this.port && !this.port.error;
	};
}
