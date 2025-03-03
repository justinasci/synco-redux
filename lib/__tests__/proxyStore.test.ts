// src/tests/proxyStoreIntegration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPort } from '../__mocks__/browser';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { createProxyStoreEnhancer, immerProxyStoreReducer } from '../main';
import { applyPatch } from '../proxyStore/proxyReducer';
import { Patch } from '../mainStore/patchGenerator';


const initialState = { count: 0, name: "___", itms: [1, 2, 4] };


export const proxyStore = configureStore({
    reducer: immerProxyStoreReducer<typeof initialState>,
    enhancers: d => d().concat(createProxyStoreEnhancer())
});

describe('Proxy Store Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks(); // Reset mocks before each test
    });

    it('should forward action from proxy store to main store', () => {
        // Simulate dispatching an action in the proxy store
        proxyStore.dispatch({ type: "mainStore/increment", payload: undefined });

        // Expect the message to be sent to the main store
        expect(mockPort.postMessage).toHaveBeenCalledWith({
            type: 'DISPATCH_ACTION',
            action: { type: "mainStore/increment", payload: undefined },
        });
    });

    it("should replace state", () => {
        proxyStore.dispatch(applyPatch(
            [{ op: 'replace', path: ['count'], value: 10 }],
        ));

        expect(mockPort.postMessage).not.toHaveBeenCalled();

        expect(proxyStore.getState().count).toBe(10);
    });

    it('should add a new property to the state', () => {
        const patches = [
            { op: 'add', path: ['age'], value: 30 },
        ] as Patch[];

        proxyStore.dispatch(applyPatch(patches));

        // Check if the new property has been added

        //@ts-expect-error
        expect(proxyStore.getState().age).toBe(30);
    });


    it('should delete a property from the state', () => {
        const patches = [
            { op: 'remove', path: ['name'] },
        ] as Patch[];

        proxyStore.dispatch(applyPatch(patches));

        // Check if the property has been removed
        expect(proxyStore.getState().name).toBeUndefined();
    });

    it("should update arrays", () => {
        proxyStore.dispatch(applyPatch(
            [{ op: 'replace', path: ['itms', 2], value: 999 }],
        ));

        expect(proxyStore.getState().itms[2]).toBe(999);
    });
});
