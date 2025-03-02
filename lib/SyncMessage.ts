import { Patch } from "./masterStore/patchGenerator";

const SyncMessageActions = ["PATCH_STATE", "SYNC_GLOBAL", "DISPATCH_ACTION"] as const;
export const [PATCH_STATE, SYNC_GLOBAL, DISPATCH_ACTION] = SyncMessageActions;


export type SyncMessage = {
    type: typeof PATCH_STATE,
    patches: Patch[],
} | {
    type: typeof SYNC_GLOBAL,
    state: any
} | {
    type: typeof DISPATCH_ACTION,
    action: any;
}

export const isSyncMessage = (message: any) => {
    const type = message.type;
    if (type) {
        return SyncMessageActions.includes(type);
    }
    return false;
}

export const patchMessage = (patches: Patch[]): SyncMessage => ({
    type: PATCH_STATE,
    patches,
})

export const syncMessage = (state?: any): SyncMessage => ({
    type: SYNC_GLOBAL,
    state,
})

export const dispatchMesssage = (action: any): SyncMessage => ({
    type: DISPATCH_ACTION,
    action,
})