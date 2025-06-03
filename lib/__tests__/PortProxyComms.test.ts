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
} from '../syncMessage';
import { applyPatch, syncGlobal } from '../proxyStore/proxyReducer';

import Browser from 'webextension-polyfill';
import { PortProxyComms } from '../adapters/extension/PortProxyComms';
import { IntervalTimer } from '../utils/IntervalTimer';
import * as ProxyReadySyncModule from '../proxyStore/isProxyReadySync';

// Mock the store and actions
const mockDispatch = vi.fn();
const mockGetState = vi.fn();

const mockStore = {
	dispatch: mockDispatch,
	getState: mockGetState
} as unknown as Store;

// Mock IntervalTimer
vi.mock('../utils/IntervalTimer', () => {
	const mockStart = vi.fn();
	return {
		IntervalTimer: vi.fn(() => ({
			start: mockStart,
			stop: vi.fn()
		}))
	};
});

describe('BrowserExtensionProxyComms', () => {
	let comms: PortProxyComms;

	// Helper function to create a basic mock port
	const createMockPort = (overrides = {}) => ({
		onMessage: { addListener: vi.fn(), hasListener: vi.fn() },
		postMessage: vi.fn(),
		onDisconnect: { addListener: vi.fn(), hasListener: vi.fn() },
		disconnect: vi.fn(),
		error: undefined,
		...overrides
	});

	// Helper function to create a minimal mock port (for simple tests)
	const createMinimalMockPort = (overrides = {}) => ({
		postMessage: vi.fn(),
		...overrides
	});

	// Helper function to create an error port
	const createErrorPort = (error = new Error('Connection error')) =>
		createMockPort({ error });

	beforeEach(() => {
		vi.resetAllMocks();
		comms = new PortProxyComms(Browser);
	});

	it('should connect to the browser extension runtime', () => {
		const mockPort = createMockPort();

		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		comms.connect();
		expect(Browser.runtime.connect).toHaveBeenCalledWith({
			name: SYNCO_PORT_ID
		});

		expect(comms.port).toBeDefined();
	});

	it('should initialize and set up message listener', () => {
		const mockPort = createMockPort();

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
		const mockPort = createMinimalMockPort();

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

	// New tests for sync retry logic
	it('should create an IntervalTimer for sync retries during init', () => {
		const mockPort = createMockPort();

		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		comms.init(mockStore);

		// Verify that IntervalTimer was created
		expect(IntervalTimer).toHaveBeenCalled();
		expect(IntervalTimer).toHaveBeenCalledWith(expect.any(Function), 500);
	});

	it('should retry sync message when store is not synced', () => {
		const mockPort = createMockPort();

		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		// Setup spy on isProxyReadySync
		const isReadySpy = vi.spyOn(ProxyReadySyncModule, 'isProxyReadySync');
		isReadySpy.mockReturnValue(false);

		comms.init(mockStore);

		// Get the callback function passed to IntervalTimer
		const timerCallback = vi.mocked(IntervalTimer).mock.calls[0][0];

		// Reset postMessage call count
		mockPort.postMessage.mockClear();

		// Call the timer callback
		timerCallback();

		// Verify that sync message was sent again
		expect(mockPort.postMessage).toHaveBeenCalledWith(syncMessage());
	});

	it('should stop retry timer when store is synced', () => {
		const mockPort = createMockPort();

		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		// Setup spy on isProxyReadySync
		const isReadySpy = vi.spyOn(ProxyReadySyncModule, 'isProxyReadySync');
		isReadySpy.mockReturnValue(true);

		comms.init(mockStore);

		// Set up a mock for the timer's stop method
		const mockStop = vi.fn();
		comms.syncIntervalTimer = { stop: mockStop } as unknown as IntervalTimer;

		// Get the callback function passed to IntervalTimer
		const timerCallback = vi.mocked(IntervalTimer).mock.calls[0][0];

		// Call the timer callback
		timerCallback();

		// Verify that timer was stopped
		expect(mockStop).toHaveBeenCalled();
	});

	it('should reconnect to port if it is invalid when sending a message', () => {
		const mockPort = createMockPort();

		// Set up connect to return our mock port
		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		// Spy on the connect method
		const connectSpy = vi.spyOn(comms, 'connect');

		// First make port undefined to force reconnect
		comms.port = undefined;

		// Try to send a message
		comms.postMessage({ type: 'TEST' });

		// Verify that connect was called
		expect(connectSpy).toHaveBeenCalled();

		// And that the message was sent
		expect(mockPort.postMessage).toHaveBeenCalledWith({ type: 'TEST' });
	});

	it('should handle port disconnection and clear the port reference', () => {
		const mockPort = createMockPort();
		const reconnectPort = createMockPort();

		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(mockPort);

		// Use init instead of connect to ensure setupPort is called
		comms.init(mockStore);
		expect(comms.port).toBeDefined();

		// Mock the second connection for reconnection
		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(reconnectPort);

		// Get the onDisconnect listener
		const disconnectListener =
			mockPort.onDisconnect.addListener.mock.calls[0][0];

		// Call the disconnect listener
		disconnectListener();

		// The handleOnDisconnect method calls setupPort() again, which creates a new connection
		// So the port should be the new reconnect port, not undefined
		expect(comms.port).toBe(reconnectPort);

		// Verify that a new connection was established
		expect(Browser.runtime.connect).toHaveBeenCalledTimes(2);
	});

	it('should reconnect if port has an error', () => {
		const errorPort = createErrorPort();
		const validPort = createMockPort();

		// First set the port to the error port
		comms.port = errorPort as any;

		// Mock connect to return the valid port
		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(validPort);

		// Now try to connect again
		comms.connect();

		// The connect method doesn't call disconnect on the old port,
		// it just replaces it with a new one
		expect(comms.port).toBe(validPort);
		// The old port should not be disconnected by the connect method
		expect(errorPort.disconnect).not.toHaveBeenCalled();
	});

	it('should not reconnect if port is valid', () => {
		const validPort = createMockPort();

		// Set up the mock
		//@ts-expect-error mock
		Browser.runtime.connect.mockReturnValue(validPort);

		// Set the port and spy on connect
		comms.port = validPort as any;
		const connectSpy = vi.spyOn(Browser.runtime, 'connect');

		// Clear previous calls
		connectSpy.mockClear();

		// Try to connect - should do nothing since port is valid
		comms.connect();

		// Connect should not have been called again
		expect(connectSpy).not.toHaveBeenCalled();
	});
});
