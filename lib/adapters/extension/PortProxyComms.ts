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
import { ILogger, SilentLogger } from '../../utils/log';
import { IProxyCommsOptions } from './IProxyCommsOptions';

const HEARTBEAT_ALARM_NAME = 'synco-redux-heartbeat';

const DEFAULT_OPTIONS: IProxyCommsOptions = {
	resyncOnFocus: true,
	heartbeatPeriod: 1,
	heartbeatResyncThreshold: 5000,
	enableHeartbeat: true,
	logger: SilentLogger
};

export class PortProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;
	syncIntervalTimer: IntervalTimer | undefined;
	store: Store | undefined;

	lastUpdate: number | null = null;
	options: IProxyCommsOptions;

	logger: ILogger;

	constructor(
		private browser: typeof Browser,
		options: Partial<IProxyCommsOptions> = {}
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };

		this.logger = options.logger || SilentLogger;

		if (this.browser.alarms && this.options.enableHeartbeat) {
			this.logger.info('setting up an alarm:', HEARTBEAT_ALARM_NAME);
			this.browser.alarms.onAlarm.addListener(this.handleAlarm);

			this.browser.alarms.create(HEARTBEAT_ALARM_NAME, {
				periodInMinutes: this.options.heartbeatPeriod
			});
		}

		if (this.options.resyncOnFocus && document) {
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') {
					this.handleHeartbeat();
				}
			});
		}

		if (window) {
			// bfcache fix, if the page is cached, the port will be undefined§
			window.addEventListener('pageshow', (event) => {
				if (event.persisted) {
					if (this.port) {
						this.logger.log('pageshow: port is valid, reconnecting');
						this.port.disconnect();
					} else {
						this.logger.log('pageshow: port is not valid, setting up port');
						this.setupPort();
					}
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
			this.logger.log('postMessage: port is not valid, setting up port');
			this.setupPort();
		}
		this.logger.log('postMessage: sending message', message);
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
		return this.port !== undefined && !this.port.error;
	};

	private handleOnMessage = (message: unknown) => {
		this.logger.log('received message', message);

		if (!isSyncMessage(message)) {
			return;
		}

		this.lastUpdate = Date.now();

		this.handleMessage(this.store!, message as SyncMessage);
	};

	private handleOnDisconnect = () => {
		this.logger.log(
			` Disconnected due to an error: ${this.port?.error?.message}`
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

		this.logger.log('Failed to sync with main, retrying...');
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

		this.logger.log('heartbeat alarm');
		this.handleHeartbeat();
	};

	private handleHeartbeat = () => {
		if (!this.lastUpdate) {
			return;
		}

		const nextUpdateThreshold =
			this.lastUpdate + this.options.heartbeatResyncThreshold;

		const isPortConnectedButNoLastUpdate =
			this.getIsPortValid() && !this.lastUpdate;

		this.logger.info(
			' heartbeat resync threshold',
			nextUpdateThreshold,
			this.lastUpdate,
			{
				nextUpdateThreshold,
				isPortConnectedButNoLastUpdate
			}
		);

		if (nextUpdateThreshold > Date.now() && !isPortConnectedButNoLastUpdate) {
			return;
		}

		this.lastUpdate = Date.now();
		this.logger.log(' heartbeat resync');
		this.postMessage(syncMessage());
	};
}

