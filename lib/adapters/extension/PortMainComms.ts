import { type Store } from '@reduxjs/toolkit';
import { IComms } from '../IComms';
import type Browser from 'webextension-polyfill';
import { SYNCO_PORT_ID } from '../../constants';
import {
	DISPATCH_ACTION,
	isSyncMessage,
	patchMessage,
	SYNC_GLOBAL,
	syncMessage,
	SyncMessage
} from '../../syncMessage';
import { Patch } from '../../mainStore/patchGenerator';
import { ILogger, SilentLogger } from '../../utils/log';

export interface IMainCommsOptions {
	logger: ILogger;
}

export class PortMainComms implements IComms {
	openPorts: Browser.Runtime.Port[] = [];
	store: Store | undefined;

	private logger: ILogger;

	constructor(
		private browser: typeof Browser,
		options: IMainCommsOptions = {
			logger: SilentLogger
		}
	) {
		this.logger = options.logger || SilentLogger;
	}

	init = (store: Store) => {
		this.logger.info('init');
		this.store = store;
		this.browser.runtime.onConnect.addListener(this.setupListener);
	};

	submitPatches = (patches: Patch[]) => {
		if (patches.length === 0 || this.openPorts.length === 0) {
			return;
		}

		this.logger.info('submitting patches:', {
			patches,
			openPorts: this.openPorts.length
		});

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
			port.postMessage(syncMessage(store.getState()));
		}
	};

	private setupListener = (port: Browser.Runtime.Port) => {
		if (port.name !== SYNCO_PORT_ID) {
			return;
		}

		this.logger.info('port connected', {
			port,
			openPorts: this.openPorts
		});

		this.openPorts.push(port);

		port.onDisconnect.addListener(() => {
			this.logger.info('port disconnected');
			this.openPorts = this.openPorts.filter((p) => p !== port);
		});

		port.onMessage.addListener((m) => {
			if (!isSyncMessage(m)) {
				return;
			}

			if (!this.store) {
				return;
			}

			this.logger.info('port message received', m);
			this.handlePortMessage(port, this.store, m as SyncMessage);
		});
	};
}
