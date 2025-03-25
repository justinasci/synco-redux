import { type Store } from '@reduxjs/toolkit';

export interface IProxyComms {
	connect: () => void;
	init: (store: Store) => void;
	postMessage: (message: unknown) => void;
}
