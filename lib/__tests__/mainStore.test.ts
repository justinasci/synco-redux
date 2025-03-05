import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IComms } from '../adapters/IComms';
import { configureStore, createSlice, EnhancedStore } from '@reduxjs/toolkit';
import { createMainStoreEnhancer } from '../main';

describe('mainStore', () => {
	const comms: IComms = {
		init: vi.fn(),
		submitPatches: vi.fn()
	};

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
			increment: (state: { count: number }) => {
				state.count += 1;
			},
			crazy: (state: { neste: { some: { old: number } } }) => {
				state.neste.some.old = 0;
			}
		}
	});

	let mainStore: EnhancedStore;

	beforeEach(() => {
		vi.resetAllMocks();
		mainStore = configureStore({
			reducer: mainStoreSlice.reducer,
			enhancers: (d) => d().concat(createMainStoreEnhancer(comms))
		});
	});

	it('should initialize comms', () => {
		expect(comms.init).toHaveBeenCalled();
	});

	it('should update internal state', () => {
		mainStore.dispatch(mainStoreSlice.actions.increment());
		expect(mainStore.getState().count).toBe(1);
	});

	it('should dispatch patches to comms', () => {
		mainStore.dispatch(mainStoreSlice.actions.increment());
		expect(comms.submitPatches).toHaveBeenCalledWith([
			{
				op: 'replace',
				path: ['count'],
				value: 1
			}
		]);
	});
});
