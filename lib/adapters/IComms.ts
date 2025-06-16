import { type Store } from '@reduxjs/toolkit';
import { Patch } from '../mainStore/patchGenerator';

export interface IComms {
	/**
	 * Initialize the comms, with local store
	 */
	init: (store: Store) => void;

	/**
	 * Send a message to the main store
	 */
	submitPatches: (patches: Patch[]) => void;
}
