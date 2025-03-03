import { type Store, type StoreEnhancer } from "@reduxjs/toolkit";
import browser from "webextension-polyfill";

import { SYNC_KEY, SYNCO_PORT_ID } from "../constants";
import { dispatchMesssage, isSyncMessage, PATCH_STATE, SYNC_GLOBAL, syncMessage, SyncMessage } from "../SyncMessage";
import { APPLY_PATCH_ACTION, applyPatch, SYNC_GLOBAL_ACTION, syncGlobal } from "./proxyReducer";


export interface ProxyState {
    [SYNC_KEY]: boolean;
    [key: string]: any;
}

export const initialState: ProxyState = {
    isStateSynced: false
};

export const createProxyStoreEnhancer = (): StoreEnhancer => {

    const port = browser.runtime.connect({ name: SYNCO_PORT_ID, });

    const handleMessage = (store: Store, message: SyncMessage) => {

        if (message.type === PATCH_STATE) {
            store.dispatch(applyPatch(message.patches) as any);
        } else if (message.type === SYNC_GLOBAL) {
            store.dispatch(syncGlobal(message.state) as any);
        }
    }

    const enhancer: StoreEnhancer = (createStore) => (reducers, initalState) => {
        const store = createStore(reducers, initalState);
        const originalDispatch = store.dispatch;

        store.dispatch = (action) => {
            if ([APPLY_PATCH_ACTION, SYNC_GLOBAL_ACTION].includes(action.type as any)) {
                return originalDispatch(action);
            }

            port.postMessage(dispatchMesssage(action));
            return action;
        };

        port.onMessage.addListener((message) => {
            if (!isSyncMessage(message)) {
                return;
            }

            handleMessage(store, message as SyncMessage);
        });

        port.postMessage(syncMessage());

        return store;

    }

    return enhancer;
};