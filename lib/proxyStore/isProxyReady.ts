import { Store } from "@reduxjs/toolkit";
import { isProxyStore } from "./isProxyStore";
import { SYNC_KEY } from "../constants";

export const isProxyReady =
    (proxyStore: Store) => {
        if (!isProxyStore(proxyStore)) {
            return Promise.reject(new Error("Store is not a proxy"));
        }

        const isSynced = () => {
            return proxyStore.getState()[SYNC_KEY];
        }


        if (isSynced()) {
            return Promise.resolve(true);
        }

        return new Promise<boolean>(resolve => {
            const unsubscribe = proxyStore.subscribe(() => {
                if (isSynced()) {
                    unsubscribe();
                    resolve(true);
                }
            });
        });


    }