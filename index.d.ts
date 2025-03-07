// src/types/global.d.ts

import { SYNCO_ELECTRON_API_KEY } from './lib/constants';

export {};

declare global {
	interface Window {
		[SYNCO_ELECTRON_API_KEY]: {
			sendMessage(channel: string, data: unknown): void;
			onMessage(
				channel: string,
				callback: (event: Event, message: unknown) => void
			): void;
			onceMessage(
				channel: string,
				callback: (event: Event, message: unknown) => void
			): void;
		};
	}
}
