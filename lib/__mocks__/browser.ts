import { vi } from "vitest";
import browser from "webextension-polyfill"

export const mockPort = {
    postMessage: vi.fn(),
    onMessage: {
        addListener: vi.fn(),
    },
    onDisconnect: {
        addListener: vi.fn(),
    },
};

globalThis.browser = {
    runtime: {
        connect: vi.fn(() => mockPort),
    },
} as unknown as typeof browser;