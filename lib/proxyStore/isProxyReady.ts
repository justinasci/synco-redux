import { Store } from "@reduxjs/toolkit";
import { isProxyStore } from "./isProxyStore";

export const isProxyReady =
    (proxyStore: Store) => new Promise<void>(resolve => {

        if (isProxyStore(proxyStore)) {
            resolve();
            return;
        }

        const unsubscribe = proxyStore.subscribe(() => {
            if (isProxyStore(proxyStore)) {
                unsubscribe();
                resolve();
            }
        });
    });