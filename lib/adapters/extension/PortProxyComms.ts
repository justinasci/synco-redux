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
	store: Store | undefined;

	constructor(private browser: typeof Browser) {}

	private openPort = () => {
		return this.browser.runtime.connect({ name: SYNCO_PORT_ID });
	};

	connect = () => {
		if (this.port) {
			if (!this.port.error) {
				return this.port;
			}
		}
		this.port = this.openPort();

		return this.port;
	};

	init = (store: Store) => {
		this.store = store;
		this.setupPort();
	};

	postMessage = (message: unknown) => {
		if (!this.getIsPortValid()) {
			this.setupPort();
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

	private handleOnMessage = (message: unknown) => {
		if (!isSyncMessage(message)) {
			return;
		}

		this.handleMessage(this.store!, message as SyncMessage);
	};

	private handleOnDisconnect = () => {
		console.log(
			`[SyncoRedux] Disconnected due to an error: ${this.port?.error?.message}`
		);
		this.port = undefined;
		if (this.store) {
			this.setupPort();
		}
	};

	private handleSyncRetry = () => {
		if (isProxyReadySync(this.store!)) {
			this.syncIntervalTimer?.stop();
			return;
		}

		console.warn('[SyncoRedux] Failed to sync with main, retrying...');
		this.postMessage(syncMessage());
	};

	private setupPort = () => {
		const port = this.connect();

		if (!port.onMessage.hasListener(this.handleOnMessage)) {
			port.onMessage.addListener(this.handleOnMessage);
		}

		if (!port.onDisconnect.hasListener(this.handleOnDisconnect)) {
			port.onDisconnect.addListener(this.handleOnDisconnect);
		}

		if (this.syncIntervalTimer) {
			this.syncIntervalTimer.stop();
		}

		this.postMessage(syncMessage());
		this.syncIntervalTimer = new IntervalTimer(this.handleSyncRetry, 500);
	};
}
