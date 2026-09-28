import { ILogger } from '../../utils/log';

export interface IProxyCommsOptions {
	/**
	 * Triggers resync when tab is in focus
	 * @default false
	 */
	resyncOnFocus: boolean;

	/**
	 * Whether to enable the heartbeat alarm
	 * @default false
	 */
	enableHeartbeat: boolean;

	/**
	 * The period of the heartbeat alarm, in minutes
	 * @default 1 minute
	 */
	heartbeatPeriod: number;

	/**
	 * The threshold from the last update to the next resync, in milliseconds.
	 * @default 5000 ms
	 */
	resyncThreshold: number;

	/**
	 * The delay before the first reconnect or sync retry, in milliseconds.
	 * Doubles on each consecutive attempt. The reconnect backoff resets once
	 * a message is received, the sync retry backoff on every new port.
	 * @default 500 ms
	 */
	retryBaseDelay: number;

	/**
	 * The maximum delay between reconnect or sync retry attempts, in milliseconds.
	 * @default 30000 ms
	 */
	retryMaxDelay: number;

	/**
	 * The logger to use, defaults to no logging
	 * @default no logging
	 * @see {@link ILogger} for the interface
	 */
	logger: ILogger;
}
