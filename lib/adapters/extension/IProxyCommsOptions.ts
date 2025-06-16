import { ILogger } from '../../utils/log';

export interface IProxyCommsOptions {
	/**
	 * Triggers resync when tab is in focus
	 * @default true
	 */
	resyncOnFocus: boolean;

	/**
	 * Whether to enable the heartbeat alarm
	 * @default true
	 */
	enableHeartbeat: boolean;

	/**
	 * The period of the heartbeat alarm, in minutes
	 * @default 1 minute
	 */
	heartbeatPeriod: number;

	/**
	 * The threshold from the last update to the next heartbeat, in milliseconds.
	 * @default 5000 ms
	 */
	heartbeatResyncThreshold: number;

	/**
	 * The logger to use, defaults to no logging
	 * @default no logging
	 * @see {@link ILogger} for the interface
	 */
	logger: ILogger;
}
