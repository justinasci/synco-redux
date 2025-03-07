import { Store } from '@reduxjs/toolkit';
import { type IProxyComms } from './IProxyComms';
import { type IpcRenderer } from 'electron';
import { SYNCO_PORT_ID } from '../constants';
import {
	isSyncMessage,
	PATCH_STATE,
	SYNC_GLOBAL,
	SyncMessage,
	syncMessage
} from '../SyncMessage';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';

export class ElectronProxyComms implements IProxyComms {
	constructor(private ipcRenderer: IpcRenderer) {}

	connect = () => {
		console.log('Renderer: Connecting to main process');
	};

	init = (store: Store) => {
		this.ipcRenderer.send(SYNCO_PORT_ID, syncMessage());

		this.ipcRenderer.on(SYNCO_PORT_ID, (_event, message: SyncMessage) => {
			if (!isSyncMessage(message)) {
				return;
			}
			this.handleMessage(store, message as SyncMessage);
		});
	};

	postMessage = (message: unknown) => {
		this.ipcRenderer.send(SYNCO_PORT_ID, message);
	};

	private handleMessage = (store: Store, message: SyncMessage) => {
		if (message.type === PATCH_STATE) {
			store.dispatch(applyPatch(message.patches));
		} else if (message.type === SYNC_GLOBAL) {
			store.dispatch(syncGlobal(message.state as never));
		}
	};
}
