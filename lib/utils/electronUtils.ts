import { type ContextBridge, type IpcRenderer } from 'electron';
import { SYNCO_ELECTRON_API_KEY } from '../constants';

export const getSyncoReduxElectronApi = (ipcRenderer: IpcRenderer) => ({
	sendMessage: (channel: string, data: unknown) =>
		ipcRenderer.send(channel, data),
	onMessage: (channel: string, callback: Electron.IpcRendererEventListener) =>
		ipcRenderer.on(channel, callback),
	onceMessage: (channel: string, callback: Electron.IpcRendererEventListener) =>
		ipcRenderer.once(channel, callback)
});

export const registerSyncoReduxContextBridge = (
	contextBridge: ContextBridge,
	ipcRenderer: IpcRenderer
) => {
	contextBridge.exposeInMainWorld(
		SYNCO_ELECTRON_API_KEY,
		getSyncoReduxElectronApi(ipcRenderer)
	);
};
