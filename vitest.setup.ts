import { vi } from "vitest";

vi.stubGlobal('chrome', {
    runtime: {
        id: 'mocked-extension-id', // Mock the runtime id
    },
});

vi.stubGlobal('document', {
	visibilityState: 'visible',
	addEventListener: vi.fn()
});
