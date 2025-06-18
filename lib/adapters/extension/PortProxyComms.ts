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
	resyncOnFocus: false,
	enableHeartbeat: false,
	resyncThreshold: 5000,
	heartbeatPeriod: 1,
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

		this.setupAlarm();
		this.setupTabFocusHandler();
		this.setupBFCacheHandler();
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
		this.logger.info('received message', message);

		if (!isSyncMessage(message)) {
			return;
		}

		this.lastUpdate = Date.now();

		this.handleMessage(this.store!, message as SyncMessage);
	};

	private handleOnDisconnect = () => {
		this.logger.warn(
			`Disconnected due to an error: ${this.port?.error?.message}`
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

		this.logger.warn('Failed to sync with main, retrying...');
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

		this.logger.info('heartbeat alarm');
		this.handleHeartbeat();
	};

	private handleHeartbeat = () => {
		if (!this.lastUpdate) {
			return;
		}

		const nextUpdateThreshold = this.lastUpdate + this.options.resyncThreshold;

		const isPortConnectedButNoLastUpdate =
			this.getIsPortValid() && !this.lastUpdate;

		this.logger.info(
			'heartbeat resync threshold',
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
		this.logger.info('heartbeat resync');
		this.postMessage(syncMessage());
	};

	private setupAlarm = async () => {
		if (!this.browser.alarms) {
			return;
		}

		const existingAlarm = await this.browser.alarms.get(HEARTBEAT_ALARM_NAME);

		if (this.options.enableHeartbeat) {
			this.browser.alarms.onAlarm.addListener(this.handleAlarm);

			this.browser.alarms.create(HEARTBEAT_ALARM_NAME, {
				periodInMinutes: this.options.heartbeatPeriod
			});
		} else if (existingAlarm) {
			await this.browser.alarms.clear(HEARTBEAT_ALARM_NAME);
		}
	};

	private setupBFCacheHandler = () => {
		if (!window) {
			return;
		}
		// bfcache fix, if the page is cached, the port will be undefined
		window.addEventListener('pageshow', (event) => {
			if (event.persisted) {
				if (this.port) {
					this.logger.warn('pageshow: port is valid, reconnecting');
					this.port.disconnect();
				} else {
					this.logger.warn('pageshow: port is not valid, setting up port');
					this.setupPort();
				}
			}
		});
	};

	private setupTabFocusHandler = () => {
		if (!document || !this.options.resyncOnFocus) {
			return;
		}

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				this.handleHeartbeat();
			}
		});
	};
}

