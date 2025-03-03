import { Store, StoreEnhancer } from "@reduxjs/toolkit";
import browser from "webextension-polyfill";

import { generatePatches, Patch } from "./patchGenerator";
import { SYNCO_PORT_ID } from "../constants";
import { DISPATCH_ACTION, isSyncMessage, patchMessage, SYNC_GLOBAL, syncMessage, SyncMessage } from "../SyncMessage";

export const createMainStoreEnhancer = (): StoreEnhancer => {

    let openPorts: browser.Runtime.Port[] = [];

    const addPortListener = (store: Store) => {
        browser.runtime.onConnect.addListener((port) => {
            if (port.name !== SYNCO_PORT_ID) {
                return;
            }

            openPorts.push(port);

            port.onDisconnect.addListener(() => {
                openPorts = openPorts.filter(p => p !== port)
            });

            port.onMessage.addListener(m => {
                if (!isSyncMessage(m)) {
                    return;
                }
                handlePortMessage(port, store, m as SyncMessage);
            })
        });
    }

    const handlePortMessage = (port: browser.Runtime.Port, store: Store, message: SyncMessage) => {
        if (message.type === DISPATCH_ACTION && message.action) {
            store.dispatch(message.action);
        }

        if (message.type === SYNC_GLOBAL) {
            port.postMessage(syncMessage(store.getState()))
        }

    }

    const submitPatches = (patches: Patch[]) => {
        if (patches.length === 0) {
            return;
        }

        openPorts.forEach(p => {
            try {
                p.postMessage(patchMessage(patches));
            } catch (e) {
                console.error(e);
            }
        })

    }

    const enhancer: StoreEnhancer = (createStore) => (reducer, preloadstate) => {
        const store = createStore(reducer, preloadstate);
        const originalDispatch = store.dispatch;

        store.dispatch = (action) => {
            const prevState = store.getState(); // Capture state before dispatch

            // Dispatch the action to the store
            const result = originalDispatch(action);

            const nextState = store.getState(); // Capture state after dispatch

            // Generate patches comparing the previous and next state
            let patches: Patch[] = generatePatches(prevState, nextState);
            submitPatches(patches);

            return result;
        };

        addPortListener(store);

        return store;
    }

    return enhancer;
};
