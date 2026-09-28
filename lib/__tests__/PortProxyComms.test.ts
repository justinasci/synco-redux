import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('webextension-polyfill', () => {
	return {
		default: {
			runtime: {
				onConnect: {
					addListener: vi.fn()
				},
				connect: vi.fn(() => ({}))
			},
			alarms: {
				create: vi.fn(),
				onAlarm: {
					addListener: vi.fn()
				},
				get: vi.fn(),
				clear: vi.fn()
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
import * as ProxyReadySyncModule from '../proxyStore/isProxyReadySync';

// Mock the store and actions
const mockDispatch = vi.fn();
const mockGetState = vi.fn();

const mockStore = {
	dispatch: mockDispatch,
	getState: mockGetState
} as unknown as Store;

describe('BrowserExtensionProxyComms', () => {
	let comms: PortProxyComms;
	let mockPort: any;
	let mockLogger: any;

	// Shared mock setup for all tests
	beforeEach(() => {
		vi.resetAllMocks();
		mockPort = createMockPort();
		// @ts-expect-error for test mock
		Browser.runtime.connect.mockReturnValue(mockPort);
		mockLogger = { log: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() };
		comms = new PortProxyComms(Browser);
	});

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

	describe('sync retry', () => {
		let isReadySpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.useFakeTimers();
			isReadySpy = vi
				.spyOn(ProxyReadySyncModule, 'isProxyReadySync')
				.mockReturnValue(false);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should retry sync with exponential backoff until synced', () => {
			comms.init(mockStore);
			mockPort.postMessage.mockClear();

			for (const delay of [500, 1000, 2000]) {
				vi.advanceTimersByTime(delay - 1);
				expect(mockPort.postMessage).not.toHaveBeenCalled();
				vi.advanceTimersByTime(1);
				expect(mockPort.postMessage).toHaveBeenCalledWith(syncMessage());
				mockPort.postMessage.mockClear();
			}

			isReadySpy.mockReturnValue(true);
			vi.advanceTimersByTime(60000);
			expect(mockPort.postMessage).not.toHaveBeenCalled();
		});

		it('should stop retrying sync while disconnected', () => {
			comms.init(mockStore);
			mockPort.postMessage.mockClear();
			//@ts-expect-error mock
			Browser.runtime.connect.mockClear();

			mockPort.onDisconnect.addListener.mock.calls[0][0]();
			vi.advanceTimersByTime(499);

			expect(mockPort.postMessage).not.toHaveBeenCalled();
			expect(Browser.runtime.connect).not.toHaveBeenCalled();
		});
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

		vi.useFakeTimers();
		try {
			// Call the disconnect listener
			disconnectListener();

			// Reconnect is scheduled, not immediate
			expect(comms.port).toBeUndefined();

			vi.advanceTimersByTime(500);
		} finally {
			vi.useRealTimers();
		}

		// The reconnect timer calls setupPort() again, which creates a new connection
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

	describe('reconnect backoff', () => {
		const getDisconnectListener = (port: any) =>
			port.onDisconnect.addListener.mock.calls[0][0];

		beforeEach(() => {
			vi.useFakeTimers();
			//@ts-expect-error mock
			Browser.runtime.connect.mockImplementation(() => createMockPort());
			comms = new PortProxyComms(Browser, { logger: mockLogger });
			comms.init(mockStore);
		});

		afterEach(() => {
			vi.useRealTimers();
			delete (Browser.runtime as any).lastError;
		});

		it('should back off exponentially up to the max delay', () => {
			const delays = [500, 1000, 2000, 4000, 8000, 16000, 30000, 30000];

			for (const delay of delays) {
				const connectCalls = vi.mocked(Browser.runtime.connect).mock.calls
					.length;
				getDisconnectListener(comms.port)();

				vi.advanceTimersByTime(delay - 1);
				expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls);

				vi.advanceTimersByTime(1);
				expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls + 1);
			}
		});

		it('should honour custom backoff options', () => {
			comms = new PortProxyComms(Browser, {
				logger: mockLogger,
				retryBaseDelay: 100,
				retryMaxDelay: 150
			});
			comms.init(mockStore);

			for (const delay of [100, 150, 150]) {
				const connectCalls = vi.mocked(Browser.runtime.connect).mock.calls
					.length;
				getDisconnectListener(comms.port)();
				vi.advanceTimersByTime(delay);
				expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls + 1);
			}
		});

		it('should read runtime.lastError on disconnect', () => {
			const lastError = vi.fn(() => ({
				message: 'Could not establish connection. Receiving end does not exist.'
			}));
			Object.defineProperty(Browser.runtime, 'lastError', {
				get: lastError,
				configurable: true
			});

			getDisconnectListener(comms.port)();

			expect(lastError).toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Receiving end does not exist')
			);
		});

		it('should reset the backoff after a sync message is received', () => {
			getDisconnectListener(comms.port)();
			vi.advanceTimersByTime(500);
			getDisconnectListener(comms.port)();
			vi.advanceTimersByTime(1000);

			const messageListener = (comms.port as any).onMessage.addListener.mock
				.calls[0][0];
			messageListener(syncMessage());

			const connectCalls = vi.mocked(Browser.runtime.connect).mock.calls.length;
			getDisconnectListener(comms.port)();
			vi.advanceTimersByTime(500);
			expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls + 1);
		});

		it('should not open a port from postMessage while a reconnect is pending', () => {
			getDisconnectListener(comms.port)();
			const connectCalls = vi.mocked(Browser.runtime.connect).mock.calls.length;

			vi.spyOn(ProxyReadySyncModule, 'isProxyReadySync').mockReturnValue(false);

			comms.postMessage({ type: 'TEST' });
			comms.lastUpdate = 1;
			comms['handleHeartbeat']();
			comms['handleSyncRetry']();

			expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls);

			vi.advanceTimersByTime(500);
			expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls + 1);
		});

		it('should reconnect on bfcache restore without bypassing the backoff', () => {
			const pageshow = vi
				.mocked(window.addEventListener)
				.mock.calls.filter(([type]) => type === 'pageshow')
				.pop()![1] as (event: unknown) => void;

			const oldPort = comms.port as any;
			const connectCalls = vi.mocked(Browser.runtime.connect).mock.calls.length;
			pageshow({ persisted: true });

			expect(oldPort.disconnect).toHaveBeenCalled();
			expect(comms.port).not.toBe(oldPort);
			expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls + 1);

			getDisconnectListener(comms.port)();
			pageshow({ persisted: true });
			expect(Browser.runtime.connect).toHaveBeenCalledTimes(connectCalls + 1);
		});
	});

	// Heartbeat-related tests
	describe('heartbeat', () => {
		it('should trigger heartbeat resync if threshold exceeded', () => {
			const now = Date.now();
			vi.spyOn(Date, 'now').mockReturnValue(now);
			comms = new PortProxyComms(Browser, {
				logger: mockLogger,
				resyncThreshold: 1000
			});
			comms.port = mockPort;
			comms.store = mockStore;
			comms.lastUpdate = now - 2000; // Exceeds threshold
			comms['handleHeartbeat']();
			expect(mockPort.postMessage).toHaveBeenCalledWith(syncMessage());
		});

		it('should trigger heartbeat resync if no update was received yet', () => {
			comms = new PortProxyComms(Browser, { logger: mockLogger });
			comms.init(mockStore);
			mockPort.postMessage.mockClear();

			comms['handleHeartbeat']();
			expect(mockPort.postMessage).toHaveBeenCalledWith(syncMessage());
		});

		it('should not trigger heartbeat before init', () => {
			comms = new PortProxyComms(Browser, { logger: mockLogger });
			comms['handleHeartbeat']();
			expect(Browser.runtime.connect).not.toHaveBeenCalled();
		});

		it('should not trigger heartbeat resync if threshold not exceeded', () => {
			const now = Date.now();
			vi.spyOn(Date, 'now').mockReturnValue(now);
			comms = new PortProxyComms(Browser, {
				logger: mockLogger,
				resyncThreshold: 5000
			});
			comms.port = mockPort;
			comms.lastUpdate = now - 1000; // Not enough time passed
			comms['handleHeartbeat']();
			expect(mockLogger.log).not.toHaveBeenCalledWith('heartbeat resync');
			expect(mockPort.postMessage).not.toHaveBeenCalled();
		});
	});

	describe('non-DOM environments', () => {
		it('should construct where window and document are undeclared', () => {
			const globals = globalThis as Record<string, unknown>;
			const savedWindow = globals.window;
			const savedDocument = globals.document;

			delete globals.window;
			delete globals.document;

			try {
				expect(() => new PortProxyComms(Browser)).not.toThrow();
			} finally {
				globals.window = savedWindow;
				globals.document = savedDocument;
			}
		});
	});
});
