/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('webextension-polyfill', () => {
	return {
		default: {
			runtime: {
				onConnect: {
					addListener: vi.fn()
				},
				connect: vi.fn(() => ({}))
			}
		}
	};
});

import { Store } from '@reduxjs/toolkit';
import { SYNCO_PORT_ID } from '../constants';
import {
	PATCH_STATE,
	SYNC_GLOBAL,
	SyncMessage,
	syncMessage
} from '../SyncMessage';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';

import Browser from 'webextension-polyfill';
import { BrowserExtensionProxyComms } from '../adapters/BrowserExtensionProxyComms';

// Mock the store and actions
const mockDispatch = vi.fn();
const mockStore = { dispatch: mockDispatch } as unknown as Store;

describe('BrowserExtensionProxyComms', () => {
	let comms: BrowserExtensionProxyComms;

	beforeEach(() => {
		vi.resetAllMocks();
		comms = new BrowserExtensionProxyComms();
	});

	it('should connect to the browser extension runtime', () => {
		comms.connect();
		expect(Browser.runtime.connect).toHaveBeenCalledWith({
			name: SYNCO_PORT_ID
		});

		expect(comms.port).toBeDefined();
	});

	it('should initialize and set up message listener', () => {
		const mockPort = {
			onMessage: { addListener: vi.fn() },
			postMessage: vi.fn()
		};

		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		comms.init(mockStore);

		// Verify that the connection was made
		expect(Browser.runtime.connect).toHaveBeenCalledWith({
			name: SYNCO_PORT_ID
		});

		// Verify that the message listener was added
		expect(mockPort.onMessage.addListener).toHaveBeenCalled();

		// Check that the initial message was sent
		expect(mockPort.postMessage).toHaveBeenCalledWith(syncMessage());
	});

	it('should send a message via postMessage', () => {
		const mockPort = {
			postMessage: vi.fn()
		};

		comms.port = mockPort as any;

		const message = { type: 'SYNCO_TEST_MESSAGE' };
		comms.postMessage(message);

		expect(mockPort.postMessage).toHaveBeenCalledWith(message);
	});

	it('should handle PATCH_STATE message type and dispatch applyPatch', () => {
		const message: SyncMessage = {
			type: PATCH_STATE,
			patches: [{ op: 'replace', path: ['some', 'path'], value: 'newValue' }]
		};

		// Simulate receiving a message
		comms.handleMessage(mockStore, message);

		// Verify that applyPatch was dispatched with the correct patches
		expect(mockDispatch).toHaveBeenCalledWith(applyPatch(message.patches));
	});

	it('should handle SYNC_GLOBAL message type and dispatch syncGlobal', () => {
		const message: SyncMessage = {
			type: SYNC_GLOBAL,
			state: { some: 'state' }
		};

		// Simulate receiving a message
		comms.handleMessage(mockStore, message);

		// Verify that syncGlobal was dispatched with the correct state
		expect(mockDispatch).toHaveBeenCalledWith(
			syncGlobal(message.state as never)
		);
	});

	it('should ignore invalid message types in handleMessage', () => {
		const invalidMessage = { type: 'INVALID_TYPE' };

		// Simulate receiving an invalid message
		comms.handleMessage(mockStore, invalidMessage as SyncMessage);

		// Ensure no actions are dispatched
		expect(mockDispatch).not.toHaveBeenCalled();
	});
});
