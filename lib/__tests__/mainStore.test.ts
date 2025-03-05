import { configureStore, createSlice } from '@reduxjs/toolkit';
import { enablePatches } from 'immer';

import { beforeEach, describe, expect, it, vi } from 'vitest';

enablePatches();

import { MockBrowser, mockBrowser } from '../__mocks__/browser';
vi.mock('webextension-polyfill', () => {
	return {
		default: mockBrowser()
	};
});

import { createMainStoreEnhancer } from '../main';

import browser from 'webextension-polyfill';

const mockedBrowser = browser as unknown as MockBrowser;

const mainStoreSlice = createSlice({
	name: 'mainStore',
	initialState: {
		count: 0,
		oldst: '111',
		neste: {
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
	}
});

describe('MainStore', () => {
	let mainStore = configureStore({
		reducer: mainStoreSlice.reducer,
		enhancers: (d) => d().concat(createMainStoreEnhancer())
	});

	beforeEach(() => {
		vi.resetAllMocks();
		mainStore = configureStore({
			reducer: mainStoreSlice.reducer,
			enhancers: (d) => d().concat(createMainStoreEnhancer())
		});
	});

	it('should send patches to subscriebers', () => {
		mainStore.dispatch(mainStoreSlice.actions.increment());
		expect(mainStore.getState().count).toBe(1);
		expect(mockedBrowser.runtime.onConnect.addListener).toHaveBeenCalledOnce();
	});

	it('should send nested patches to subscriebers', () => {
		mainStore.dispatch(mainStoreSlice.actions.crazy());
	});
});
