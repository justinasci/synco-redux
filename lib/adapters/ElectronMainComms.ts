import { Store } from '@reduxjs/toolkit';
import { IComms } from './IComms';
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

export class ElectronComms implements IComms {
	constructor(
		private ipcMain: Electron.IpcMain,
		private ipcRenderer: Electron.IpcRenderer
	) {}
	init = (store: Store) => {
		this.ipcMain.on(SYNCO_PORT_ID, (event, message: SyncMessage) => {
			if (!isSyncMessage(message)) {
				return;
			}
			this.handleMainProcessMessage(event, store, message);
		});
	};

	submitPatches = (patches: Patch[]) => {
		if (patches.length === 0) {
			return;
		}

		this.ipcRenderer.send(SYNCO_PORT_ID, patchMessage(patches));
	};

	private handleMainProcessMessage = (
		event: Electron.IpcMainEvent,
		store: Store,
		message: SyncMessage
	) => {
		if (message.type === DISPATCH_ACTION && message.action) {
			store.dispatch(message.action);
		}

		if (message.type === SYNC_GLOBAL) {
			event.reply(syncMessage(store.getState()));
		}
	};
}
