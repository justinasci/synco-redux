import { type Action } from '@reduxjs/toolkit';
import { type Patch } from './mainStore/patchGenerator';

export const SyncMessageActions = [
	'PATCH_STATE',
	'SYNC_GLOBAL',
	'DISPATCH_ACTION'
] as const;
export const [PATCH_STATE, SYNC_GLOBAL, DISPATCH_ACTION] = SyncMessageActions;

export type SyncMessage =
	| {
			type: typeof PATCH_STATE;
			patches: Patch[];
	  }
	| {
			type: typeof SYNC_GLOBAL;
			state: unknown;
	  }
	| {
			type: typeof DISPATCH_ACTION;
			action: Action;
	  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isSyncMessage = (message: any) => {
	const type = message?.type;
	if (type) {
		return SyncMessageActions.includes(type);
	}
	return false;
};

export const patchMessage = (patches: Patch[]): SyncMessage => ({
	type: PATCH_STATE,
	patches
});

export const syncMessage = (state?: unknown): SyncMessage => ({
	type: SYNC_GLOBAL,
	state
});

export const dispatchMesssage = (action: Action): SyncMessage => ({
	type: DISPATCH_ACTION,
	action
});
