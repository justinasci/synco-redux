import { vi } from 'vitest';

export type MockPort = ReturnType<typeof mockPort>;
export type MockListener = ReturnType<typeof mockPortListener>;
export type MockBrowser = ReturnType<typeof mockBrowser>;

class ConnectionHandler {
	connections: Map<string, MockPort> = new Map();
	listeners: MockListener[] = [];

	sendMessageFromPort = (message: unknown) => {
		this.listeners.forEach((l) => l.receiveMessage(message));
	};

	addConnection = (id: string, port: MockPort) => {
		this.listeners.forEach((l) => l.connect(port));
	};

	addListener = (listener: MockListener) => {
		this.listeners.push(listener);
	};

	reset = () => {
		this.connections = new Map();
		this.listeners = [];
	};
}

export const mockPortListener = (handler: ConnectionHandler) => {
	const onConnections: ((port: MockPort) => void)[] = [];
	const onMessage: ((message: unknown) => void)[] = [];
	const onDisconned: (() => void)[] = [];
	const connections: MockPort[] = [];

	console.log('created port listener');

	const fakeListener = {
		receiveMessage: (message: unknown) => {
			onMessage.forEach((handler) => handler(message));
		},

		connect: (port: MockPort) => {
			connections.push(port);
		},

		postMessage: vi.fn((message: unknown) => {
			connections.forEach((c) => c.receiveMessage(message));
		}),

		onConnect: {
			addListener: vi.fn((cb: (port: MockPort) => void) => {
				onConnections.push(cb);
			})
		},
		onMessage: {
			addListener: vi.fn((cb: (message: unknown) => void) => {
				onMessage.push(cb);
			})
		},
		onDisconnect: {
			addListener: vi.fn((cb: () => void) => {
				onDisconned.push(cb);
			})
		}
	};

	handler.addListener(fakeListener);

	return fakeListener;
};

export const mockPort = (name: string, handler: ConnectionHandler) => {
	const msgListeners: ((msg: unknown) => void)[] = [];
	const onDisconnectListeners: (() => void)[] = [];

	const fakePort = {
		name,
		receiveMessage: (msg: unknown) => {
			msgListeners.forEach((listener) => listener(msg));
		},
		postMessage: vi.fn((message: unknown) => {
			handler.sendMessageFromPort(message);
		}),
		onMessage: {
			listeners: [],
			addListener: vi.fn((cb: (msg: unknown) => void) => {
				msgListeners.push(cb);
			})
		},
		onDisconnect: {
			addListener: vi.fn((cb: () => void) => {
				onDisconnectListeners.push(cb);
			})
		}
	};

	return fakePort;
};

export const mockBrowser = () => {
	const handler = new ConnectionHandler();

	const chrome = {
		runtime: {
			connect: vi.fn(({ name }: { name: string }) => mockPort(name, handler)),
			onConnect: {
				addListener: vi.fn(() => mockPortListener(handler))
			}
		},
		handler
	};

	return chrome;
};
