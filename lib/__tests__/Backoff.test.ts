import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Backoff } from '../utils/Backoff';

describe('Backoff', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should double the delay on each attempt up to the max delay', () => {
		const backoff = new Backoff(100, 500);
		const callback = vi.fn();

		const delays = [100, 200, 400, 500, 500].map((expected) => {
			const delay = backoff.schedule(callback);
			vi.advanceTimersByTime(expected);
			return delay;
		});

		expect(delays).toEqual([100, 200, 400, 500, 500]);
		expect(callback).toHaveBeenCalledTimes(5);
	});

	it('should run the callback only after the delay', () => {
		const backoff = new Backoff(100, 500);
		const callback = vi.fn();

		backoff.schedule(callback);
		vi.advanceTimersByTime(99);
		expect(callback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('should not schedule while a callback is pending', () => {
		const backoff = new Backoff(100, 500);
		const first = vi.fn();
		const second = vi.fn();

		backoff.schedule(first);
		expect(backoff.schedule(second)).toBeUndefined();
		vi.advanceTimersByTime(1000);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});

	it('should allow rescheduling from within the callback', () => {
		const backoff = new Backoff(100, 500);
		const callback = vi.fn(() => {
			backoff.schedule(callback);
		});

		backoff.schedule(callback);
		vi.advanceTimersByTime(100 + 200);

		expect(callback).toHaveBeenCalledTimes(2);
		expect(backoff.isPending).toBe(true);
	});

	it('should report pending state', () => {
		const backoff = new Backoff(100, 500);

		expect(backoff.isPending).toBe(false);
		backoff.schedule(vi.fn());
		expect(backoff.isPending).toBe(true);
		vi.advanceTimersByTime(100);
		expect(backoff.isPending).toBe(false);
	});

	it('should cancel the pending callback and keep the attempt count', () => {
		const backoff = new Backoff(100, 500);
		const callback = vi.fn();

		backoff.schedule(callback);
		backoff.cancel();
		vi.advanceTimersByTime(1000);

		expect(callback).not.toHaveBeenCalled();
		expect(backoff.isPending).toBe(false);
		expect(backoff.schedule(callback)).toBe(200);
	});

	it('should reset the delay to the base delay', () => {
		const backoff = new Backoff(100, 500);

		backoff.schedule(vi.fn());
		vi.advanceTimersByTime(100);
		backoff.reset();

		expect(backoff.schedule(vi.fn())).toBe(100);
	});
});
