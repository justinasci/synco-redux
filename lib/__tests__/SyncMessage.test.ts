import { describe, expect, it } from 'vitest';
import { isSyncMessage, SyncMessageActions } from '../SyncMessage';

describe('isSyncMessage', () => {
	it.each(SyncMessageActions)('with type %s to be true', (args) => {
		expect(isSyncMessage({ type: args })).toBe(true);
	});

	it('should handle undefined', () => {
		expect(isSyncMessage(undefined)).toBe(false);
	});

	it('should return false if there is no type', () => {
		expect(isSyncMessage({})).toBe(false);
	});

	it('should return false if type is unknown', () => {
		expect(isSyncMessage({})).toBe(false);
	});
});
