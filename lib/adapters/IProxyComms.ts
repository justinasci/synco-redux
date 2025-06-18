import { type Store } from '@reduxjs/toolkit';

export interface IProxyComms {
	/**
	 * Connect to the main store
	 */
	connect: () => void;

	/**
	 * Initialize the proxy store, with local store
	 */
	init: (store: Store) => void;

	/**
	 * Send a message to the main store
	 */
	postMessage: (message: unknown) => void;
}
