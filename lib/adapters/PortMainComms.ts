import { type Store } from '@reduxjs/toolkit';
import { IComms } from './IComms';
import type Browser from 'webextension-polyfill';
import { SYNCO_PORT_ID } from '../constants';
import {
	DISPATCH_ACTION,
	isSyncMessage,
	patchMessage,
	SYNC_GLOBAL,
	syncMessage,
	SyncMessage
} from '../SyncMessage';
import { Patch } from '../mainStore/patchGenerator';
import { ILogger } from '../ILogger';

export class PortMainComms implements IComms {
	openPorts: Browser.Runtime.Port[] = [];
	logger?: ILogger;

	constructor(
		private browser: typeof Browser,
		logger?: ILogger
	) {
		this.logger = logger;
	}

	init = (store: Store) => {
		this.browser.runtime.onConnect.addListener((port) => {
			if (port.name !== SYNCO_PORT_ID) {
				return;
			}

			this.logger?.log('Connected to port: ', port.name);

			this.openPorts.push(port);

			port.onDisconnect.addListener(() => {
				this.logger?.log(port.name, 'Disconnected');

				this.openPorts = this.openPorts.filter((p) => p !== port);
			});

			port.onMessage.addListener((m) => {
				if (!isSyncMessage(m)) {
					return;
				}
				this.handlePortMessage(port, store, m as SyncMessage);
			});
		});
	};

	submitPatches = (patches: Patch[]) => {
		if (patches.length === 0) {
			return;
		}

		this.openPorts.forEach((p) => {
			try {
				p.postMessage(patchMessage(patches));
			} catch (e) {
				console.error(e);
			}
		});
	};

	private handlePortMessage = (
		port: Browser.Runtime.Port,
		store: Store,
		message: SyncMessage
	) => {
		if (message.type === DISPATCH_ACTION && message.action) {
			store.dispatch(message.action);
		}

		if (message.type === SYNC_GLOBAL) {
			this.logger?.log(port.name, 'Syncing global state');
			port.postMessage(syncMessage(store.getState()));
		}
	};
}
