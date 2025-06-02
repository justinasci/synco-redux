import { type StoreEnhancer } from '@reduxjs/toolkit';
import { generatePatches, Patch } from './patchGenerator';
import { IComms } from '../adapters/IComms';


export const createMainStoreEnhancer = (comms: IComms): StoreEnhancer => {
	const enhancer: StoreEnhancer = (createStore) => (reducer, preloadstate) => {
		const store = createStore(reducer, preloadstate);
		const originalDispatch = store.dispatch;

		store.dispatch = (action) => {
			const prevState = store.getState();
			const result = originalDispatch(action);
			const nextState = store.getState();

			const patches: Patch[] = generatePatches(prevState, nextState);
			comms.submitPatches(patches);

			return result;
		};

		comms.init(store);

		return store;
	};

	return enhancer;
};
