import { type Store } from '@reduxjs/toolkit';
import { Patch } from '../mainStore/patchGenerator';

export interface IComms {
	init: (store: Store) => void;
	submitPatches: (patches: Patch[]) => void;
}
