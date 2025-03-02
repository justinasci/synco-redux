import { Store } from "@reduxjs/toolkit";
import { SYNC_KEY } from "../constants";

export const isProxyStore = (store: Store) => {
    return Object.hasOwn(store.getState(), SYNC_KEY);
}