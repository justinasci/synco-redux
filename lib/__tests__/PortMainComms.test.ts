import { describe, it, expect, vi, beforeEach } from 'vitest';

import { configureStore } from '@reduxjs/toolkit';

import { Patch } from '../mainStore/patchGenerator';
import { DISPATCH_ACTION, PATCH_STATE, SYNC_GLOBAL } from '../SyncMessage';
import { SYNCO_PORT_ID } from '../constants';

vi.mock('webextension-polyfill', () => {
	return {
		default: {
			runtime: {
				onConnect: {
					addListener: vi.fn()
				}
			}
		}
	};
});

import Browser from 'webextension-polyfill';
import { PortMainComms } from '../adapters/PortMainComms';

// Mock store
const mockStore = configureStore({ reducer: () => {} });

describe('BrowserExtensionMainComms', () => {
	let comms: PortMainComms;

	beforeEach(() => {
		vi.resetAllMocks();
		comms = new PortMainComms(Browser);
	});

	it('should listen for connections on init', () => {
		comms.init(mockStore);
		expect(Browser.runtime.onConnect.addListener).toHaveBeenCalled();
	});

	it('should handle port connection and message listeners', () => {
		const mockPort = {
			name: SYNCO_PORT_ID,
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() },
			postMessage: vi.fn()
		};

		comms.init(mockStore);

		// Simulate adding a listener

		const connectCallback =
			//@ts-expect-error mocks
			Browser.runtime.onConnect.addListener.mock.calls[0]?.[0];

		connectCallback(mockPort);

		expect(mockPort.onMessage.addListener).toHaveBeenCalled();
		expect(mockPort.onDisconnect.addListener).toHaveBeenCalled();
	});

	it('should send patches via submitPatches', () => {
		const mockPort = {
			name: 'SYNCO_PORT_ID',
			postMessage: vi.fn(),
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() }
		};

		comms.openPorts.push(mockPort as any);
		const patches: Patch[] = [
			{ op: 'replace', path: ['some', 'path'], value: 'newValue' }
		];

		comms.submitPatches(patches);
		expect(mockPort.postMessage).toHaveBeenCalledWith({
			type: PATCH_STATE,
			patches
		});
	});

	it('should dispatch action if DISPATCH_ACTION message is received', () => {
		const mockPort = {
			name: SYNCO_PORT_ID,
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() },
			postMessage: vi.fn()
		};

		const mockAction = { type: 'TEST_ACTION' };

		const dispatchSpy = vi.spyOn(mockStore, 'dispatch');

		comms.init(mockStore);

		const connectCallback =
			//@ts-expect-error mocks
			Browser.runtime.onConnect.addListener.mock.calls[0]?.[0];
		expect(connectCallback).toBeDefined();

		connectCallback(mockPort);

		const dispatchMessage = { type: DISPATCH_ACTION, action: mockAction };
		mockPort.onMessage.addListener.mock.calls[0]?.[0](dispatchMessage);

		// Ensure the dispatch method was called with the action
		expect(dispatchSpy).toHaveBeenCalledWith(mockAction);
	});

	it('should respond with sync message if SYNC_GLOBAL message is received', () => {
		const mockPort = {
			name: SYNCO_PORT_ID,
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() },
			postMessage: vi.fn()
		};

		comms.init(mockStore);

		const connectCallback =
			//@ts-expect-error mocks
			Browser.runtime.onConnect.addListener.mock.calls[0]?.[0];
		expect(connectCallback).toBeDefined();

		connectCallback(mockPort);

		const syncMessage = { type: SYNC_GLOBAL };

		mockPort.onMessage.addListener.mock.calls[0]?.[0](syncMessage);

		// Ensure the postMessage was called with the correct sync message
		expect(mockPort.postMessage).toHaveBeenCalledWith(syncMessage);
	});

	it('should log error if postMessage fails in submitPatches', () => {
		const mockPort = {
			name: SYNCO_PORT_ID,
			postMessage: vi.fn().mockImplementation(() => {
				throw new Error('Test error');
			}),
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() }
		};

		comms.openPorts.push(mockPort as any);

		const patches: Patch[] = [
			{ op: 'replace', path: ['some', 'path'], value: 'newValue' }
		];

		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		// Call submitPatches to simulate an error during postMessage
		comms.submitPatches(patches);

		// Ensure error was logged
		expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Test error'));

		consoleErrorSpy.mockRestore();
	});

	it('should ignore ports with invalid port.name', () => {
		const invalidPort = {
			name: 'INVALID_PORT_ID', // Invalid port ID
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() },
			postMessage: vi.fn()
		};

		comms.init(mockStore);

		const connectCallback =
			//@ts-expect-error mocks
			Browser.runtime.onConnect.addListener.mock.calls[0]?.[0];
		expect(connectCallback).toBeDefined();

		// Simulate a connection with an invalid port
		connectCallback(invalidPort);

		// Ensure that the invalid port does NOT have listeners set up
		expect(invalidPort.onMessage.addListener).not.toHaveBeenCalled();
		expect(invalidPort.onDisconnect.addListener).not.toHaveBeenCalled();
	});

	it('should remove disconnected ports from openPorts', () => {
		const mockPort = {
			name: SYNCO_PORT_ID,
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() },
			postMessage: vi.fn()
		};

		// Initialize the comms
		comms.init(mockStore);

		const connectCallback =
			//@ts-expect-error mocks
			Browser.runtime.onConnect.addListener.mock.calls[0]?.[0];
		expect(connectCallback).toBeDefined();

		// Simulate a connection with a valid port
		connectCallback(mockPort);

		// Verify the port was added to openPorts
		expect(comms.openPorts).toContain(mockPort);

		// Simulate the disconnection of the port
		mockPort.onDisconnect.addListener.mock.calls[0]?.[0](); // trigger disconnect

		// Verify that the port was removed from openPorts
		expect(comms.openPorts).not.toContain(mockPort);
	});
});
