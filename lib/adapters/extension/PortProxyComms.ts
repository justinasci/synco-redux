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

const HEARTBEAT_ALARM_NAME = 'synco-redux-heartbeat';

interface IOptions {
	resyncOnFocus: boolean;
	heartbeatPeriod: number;
	heartbeatResyncThreshold: number;
}

const DEFAULT_OPTIONS: IOptions = {
	resyncOnFocus: true,
	heartbeatPeriod: 1,
	heartbeatResyncThreshold: 5000
};

export class PortProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;
	syncIntervalTimer: IntervalTimer | undefined;
	store: Store | undefined;

	lastUpdate: number | null = null;
	options: IOptions;

	constructor(
		private browser: typeof Browser,
		options: Partial<IOptions> = {}
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };

		this.browser.alarms.create(HEARTBEAT_ALARM_NAME, {
			periodInMinutes: this.options.heartbeatPeriod
		});

		this.browser.alarms.onAlarm.addListener(this.handleAlarm);

		if (this.options.resyncOnFocus && document) {
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') {
					console.log('[SyncoRedux] tab is now focused');
					this.handleHeartbeat();
				}
			});
		}
	}

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

		this.lastUpdate = null;

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
		console.log('[SyncoRedux] received message', message);

		if (!isSyncMessage(message)) {
			return;
		}

		this.lastUpdate = Date.now();

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

	private handleAlarm = (alarm: Browser.Alarms.Alarm) => {
		if (alarm.name !== HEARTBEAT_ALARM_NAME) {
			return;
		}

		console.log('[SyncoRedux] heartbeat alarm');
		this.handleHeartbeat();
	};

	private handleHeartbeat = () => {
		if (!this.lastUpdate) {
			return;
		}

		const nextUpdateThreshold =
			this.lastUpdate + this.options.heartbeatResyncThreshold;

		console.log('[SyncoRedux] heartbeat resync threshold', nextUpdateThreshold);

		if (nextUpdateThreshold > Date.now()) {
			return;
		}

		this.lastUpdate = Date.now();
		console.log('[SyncoRedux] heartbeat resync');
		this.postMessage(syncMessage());
	};
}

