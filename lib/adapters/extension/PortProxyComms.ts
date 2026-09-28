import { type Store } from '@reduxjs/toolkit';
import { IProxyComms } from '../IProxyComms';
import type Browser from 'webextension-polyfill';
import { SYNCO_PORT_ID } from '../../constants';
import { isSyncMessage, SyncMessage, syncMessage } from '../../syncMessage';
import { handleSyncMessage } from '../../proxyStore/handleSyncMessage';
import { isProxyReadySync } from '../../proxyStore/isProxyReadySync';
import { Backoff } from '../../utils/Backoff';
import { ILogger, SilentLogger } from '../../utils/log';
import { IProxyCommsOptions } from './IProxyCommsOptions';

const HEARTBEAT_ALARM_NAME = 'synco-redux-heartbeat';

const DEFAULT_OPTIONS: IProxyCommsOptions = {
	resyncOnFocus: false,
	enableHeartbeat: false,
	resyncThreshold: 5000,
	heartbeatPeriod: 1,
	retryBaseDelay: 500,
	retryMaxDelay: 30000,
	logger: SilentLogger
};

export class PortProxyComms implements IProxyComms {
	port: Browser.Runtime.Port | undefined;
	store: Store | undefined;

	lastUpdate: number | null = null;
	options: IProxyCommsOptions;

	private reconnectBackoff: Backoff;
	private syncRetryBackoff: Backoff;

	logger: ILogger;

	constructor(
		private browser: typeof Browser,
		options: Partial<IProxyCommsOptions> = {}
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };

		this.logger = this.options.logger;

		const { retryBaseDelay, retryMaxDelay } = this.options;
		this.reconnectBackoff = new Backoff(retryBaseDelay, retryMaxDelay);
		this.syncRetryBackoff = new Backoff(retryBaseDelay, retryMaxDelay);

		void this.setupAlarm().catch((error: unknown) => {
			this.logger.error('failed to set up heartbeat alarm', error);
		});
		this.setupTabFocusHandler();
		this.setupBFCacheHandler();
	}

	private openPort = () => {
		return this.browser.runtime.connect({ name: SYNCO_PORT_ID });
	};

	connect = () => {
		if (this.getIsPortValid()) {
			return this.port!;
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
			if (this.reconnectBackoff.isPending) {
				this.logger.log('postMessage: reconnect pending, dropping message');
				return;
			}
			this.logger.log('postMessage: port is not valid, setting up port');
			this.setupPort();
		}
		this.logger.log('postMessage: sending message', message);
		this.port?.postMessage(message);
	};

	handleMessage = handleSyncMessage;

	private getIsPortValid = () => {
		return this.port !== undefined && !this.port.error;
	};

	private handleOnMessage = (message: unknown) => {
		this.logger.info('received message', message);

		if (!isSyncMessage(message)) {
			return;
		}

		this.lastUpdate = Date.now();
		this.reconnectBackoff.reset();

		this.handleMessage(this.store!, message as SyncMessage);
	};

	private handleOnDisconnect = () => {
		// Reading lastError marks it as checked, otherwise Chrome logs
		// "Unchecked runtime.lastError" on every failed connect
		const error = this.port?.error ?? this.browser.runtime.lastError;
		this.logger.warn(`Disconnected due to an error: ${error?.message}`);
		this.port = undefined;
		this.stopSyncRetry();
		if (this.store) {
			this.scheduleReconnect();
		}
	};

	private scheduleReconnect = () => {
		const delay = this.reconnectBackoff.schedule(this.setupPort);
		if (delay !== undefined) {
			this.logger.info(`reconnecting in ${delay} ms`);
		}
	};

	private stopSyncRetry = () => {
		this.syncRetryBackoff.cancel();
		this.syncRetryBackoff.reset();
	};

	private handleSyncRetry = () => {
		// an invalid port is handled by the reconnect path
		if (!this.getIsPortValid() || isProxyReadySync(this.store!)) {
			return;
		}

		this.logger.warn('Failed to sync with main, retrying...');
		this.postMessage(syncMessage());
		this.syncRetryBackoff.schedule(this.handleSyncRetry);
	};

	private setupPort = () => {
		const port = this.connect();

		if (!port.onMessage.hasListener(this.handleOnMessage)) {
			port.onMessage.addListener(this.handleOnMessage);
		}

		if (!port.onDisconnect.hasListener(this.handleOnDisconnect)) {
			port.onDisconnect.addListener(this.handleOnDisconnect);
		}

		this.stopSyncRetry();
		this.postMessage(syncMessage());
		if (this.store) {
			this.syncRetryBackoff.schedule(this.handleSyncRetry);
		}
	};

	private handleAlarm = (alarm: Browser.Alarms.Alarm) => {
		if (alarm.name !== HEARTBEAT_ALARM_NAME) {
			return;
		}

		this.logger.info('heartbeat alarm');
		this.handleHeartbeat();
	};

	private handleHeartbeat = () => {
		if (!this.store) {
			return;
		}

		const nextUpdateThreshold =
			(this.lastUpdate ?? 0) + this.options.resyncThreshold;

		this.logger.info(
			'heartbeat resync threshold',
			nextUpdateThreshold,
			this.lastUpdate
		);

		if (nextUpdateThreshold > Date.now()) {
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

			await this.browser.alarms.create(HEARTBEAT_ALARM_NAME, {
				periodInMinutes: this.options.heartbeatPeriod
			});
		} else if (existingAlarm) {
			await this.browser.alarms.clear(HEARTBEAT_ALARM_NAME);
		}
	};

	private setupBFCacheHandler = () => {
		if (typeof window === 'undefined') {
			return;
		}
		// bfcache fix, if the page is cached, the port will be undefined
		window.addEventListener('pageshow', (event) => {
			if (event.persisted) {
				if (this.port) {
					this.logger.warn('pageshow: port is valid, reconnecting');
					// disconnect() does not fire onDisconnect on this end
					this.port.disconnect();
					this.port = undefined;
				}
				if (this.reconnectBackoff.isPending) {
					this.logger.warn('pageshow: reconnect pending');
					return;
				}
				this.logger.warn('pageshow: setting up port');
				this.setupPort();
			}
		});
	};

	private setupTabFocusHandler = () => {
		if (typeof document === 'undefined' || !this.options.resyncOnFocus) {
			return;
		}

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				this.handleHeartbeat();
			}
		});
	};
}
