import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProxyStoreEnhancer, immerProxyStoreReducer } from '../main';
import { IProxyComms } from '../adapters/IProxyComms';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';
import { SYNC_KEY } from '../constants';

describe('proxyStore', () => {
	const comms: IProxyComms = {
		init: vi.fn(),
		connect: vi.fn(),
		postMessage: vi.fn()
	};

	let proxyStore: EnhancedStore;

	beforeEach(() => {
		vi.resetAllMocks();
		proxyStore = configureStore({
			reducer: immerProxyStoreReducer,
			enhancers: (d) => d().concat(createProxyStoreEnhancer(comms))
		});
	});

	it('should have synced false on init', () => {
		expect(proxyStore.getState()[SYNC_KEY]).toBe(false);
	});

	it('should connect to comms', () => {
		expect(comms.connect).toHaveBeenCalled();
	});

	it('should dispatch action to comms', () => {
		proxyStore.dispatch({
			type: 'SOME_RANDOM_ACTION',
			payload: 'SOME PAYLOAD'
		});

		expect(comms.postMessage).toBeCalledWith({
			action: {
				payload: 'SOME PAYLOAD',
				type: 'SOME_RANDOM_ACTION'
			},
			type: 'DISPATCH_ACTION'
		});
	});

	it('should not dispatch internal actions', () => {
		proxyStore.dispatch(applyPatch([]));
		proxyStore.dispatch(syncGlobal({}));
		expect(comms.postMessage).not.toHaveBeenCalled();
	});

	it('should set sync flag when sync is dispatched', () => {
		expect(proxyStore.getState()[SYNC_KEY]).toBe(false);
		proxyStore.dispatch(syncGlobal({}));
		expect(proxyStore.getState()[SYNC_KEY]).toBe(true);
	});

	it('should add state from patches', () => {
		proxyStore.dispatch(
			applyPatch([{ op: 'add', path: ['test'], value: 'TEST_VAL' }])
		);
		expect(proxyStore.getState()['test']).toBe('TEST_VAL');
	});

	it('should add deep state from patches', () => {
		proxyStore.dispatch(
			applyPatch([
				{
					op: 'add',
					path: ['test'],
					value: {
						tester: 'TEST_VAL'
					}
				}
			])
		);

		proxyStore.dispatch(
			applyPatch([{ op: 'add', path: ['test', 'test2'], value: 'TEST_ADDED' }])
		);
		expect(proxyStore.getState()['test']['test2']).toStrictEqual('TEST_ADDED');
	});

	it('should remove state from patches', () => {
		proxyStore.dispatch(
			applyPatch([{ op: 'add', path: ['test'], value: 'TEST_VAL' }])
		);

		proxyStore.dispatch(applyPatch([{ op: 'remove', path: ['test'] }]));
		expect(proxyStore.getState()['test']).toBe(undefined);
	});

	it('should remove deep from patches', () => {
		proxyStore.dispatch(
			applyPatch([
				{
					op: 'add',
					path: ['test'],
					value: {
						tester: 'TEST_VAL'
					}
				}
			])
		);

		proxyStore.dispatch(
			applyPatch([{ op: 'remove', path: ['test', 'tester'] }])
		);
		expect(proxyStore.getState()['test']).toStrictEqual({});
	});

	it('should remove element from array', () => {
		proxyStore.dispatch(
			applyPatch([{ op: 'add', path: ['test'], value: [1, 2, 3, 4] }])
		);
		proxyStore.dispatch(applyPatch([{ op: 'remove', path: ['test', 2] }]));

		expect(proxyStore.getState()['test']).toStrictEqual([1, 2, 4]);
	});

	it('should update state from patches', () => {
		proxyStore.dispatch(
			applyPatch([{ op: 'add', path: ['test'], value: 'TEST_VAL' }])
		);

		proxyStore.dispatch(
			applyPatch([{ op: 'replace', path: ['test'], value: 'UPDATED_VAL' }])
		);
		expect(proxyStore.getState()['test']).toBe('UPDATED_VAL');
	});

	it('should update deep key', () => {
		proxyStore.dispatch(
			applyPatch([
				{
					op: 'add',
					path: ['test'],
					value: {
						tester: 'TEST_VAL'
					}
				}
			])
		);

		proxyStore.dispatch(
			applyPatch([
				{ op: 'replace', path: ['test', 'tester'], value: 'UPDATED_VAL' }
			])
		);
		expect(proxyStore.getState()['test']['tester']).toBe('UPDATED_VAL');
	});

	it('should skip unknow patch operations', () => {
		const originalState = proxyStore.getState();

		proxyStore.dispatch(
			applyPatch([
				//@ts-expect-error invalid op
				{ op: 'xxx', path: ['test', 'tester'], value: 'UPDATED_VAL' }
			])
		);

		expect(originalState).toEqual(proxyStore.getState());
	});
});
