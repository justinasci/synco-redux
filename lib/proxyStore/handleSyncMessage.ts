import { type Store } from '@reduxjs/toolkit';
import { PATCH_STATE, SYNC_GLOBAL, SyncMessage } from '../syncMessage';
import { applyPatch, syncGlobal } from './proxyReducer';

/**
 * Applies a sync message from the main store to the proxy store
 * @param store - The proxy store
 * @param message - The sync message
 */
export const handleSyncMessage = (store: Store, message: SyncMessage) => {
	if (message.type === PATCH_STATE) {
		store.dispatch(applyPatch(message.patches));
	} else if (message.type === SYNC_GLOBAL) {
		store.dispatch(syncGlobal(message.state as never));
	}
};
