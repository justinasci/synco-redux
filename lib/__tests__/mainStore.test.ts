import { configureStore, createSlice } from "@reduxjs/toolkit";
import { mockPort } from "../__mocks__/browser";
import { enablePatches } from "immer";
import { createMainStoreEnhancer } from "../main";
import { beforeEach, describe, expect, it, vi } from "vitest";

enablePatches();

const mainStoreSlice = createSlice({
    name: 'mainStore',
    initialState: {
        count: 0, oldst: "111", neste: {
            some: {
                old: 123124,
                more: {
                    stuff: 999
                }
            }
        }
    },
    reducers: {
        increment: (state) => {
            state.count += 1;
        },
        crazy: (state) => {
            state.neste.some.old = 0;
        }
    },
});

// Create the main store
export const mainStore = configureStore({
    reducer: mainStoreSlice.reducer,
    enhancers: d => d().concat(createMainStoreEnhancer())
});


describe("MainStore", () => {

    beforeEach(() => {
        vi.resetAllMocks();
    })

    it("should send patches to subscriebers", () => {
        mainStore.dispatch(mainStoreSlice.actions.increment());
        expect(mainStore.getState().count).toBe(1);
        expect(mockPort.postMessage).toHaveBeenCalledWith({
            patches: [
                {
                    op: "replace",
                    path: [
                        "count",
                    ],
                    value: 1,
                },
            ],
            type: "PATCH_STATE",
        },);
    });

    it("should send nested patches to subscriebers", () => {
        mainStore.dispatch(mainStoreSlice.actions.crazy());

        expect(mockPort.postMessage).toHaveBeenCalledWith({
            patches: [
                {
                    op: "replace",
                    path: [
                        "neste",
                        "some",
                        "old",
                    ],
                    value: 0,
                },
            ],
            type: "PATCH_STATE",
        },);
    });
})