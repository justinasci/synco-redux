import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntervalTimer } from '../utils/IntervalTimer';

describe('IntervalTimer', () => {
	// Setup mocks
	beforeEach(() => {
		// Set up fake timers
		vi.useFakeTimers();
	});

	afterEach(() => {
		// Clear all mocks and restore real timers
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should create a new timer with the given callback and interval', () => {
		const callback = vi.fn();
		const timer = new IntervalTimer(callback, 500);

		expect(timer).toBeInstanceOf(IntervalTimer);
		expect(callback).not.toHaveBeenCalled(); // Callback shouldn't be called on creation
	});

	describe('start()', () => {
		it('should execute callback immediately on start', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			timer.start();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should set up an interval that calls the callback', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			timer.start();

			expect(callback).toHaveBeenCalledTimes(1);

			// Advance time by one interval
			vi.advanceTimersByTime(500);
			expect(callback).toHaveBeenCalledTimes(2);

			// Advance time by two more intervals
			vi.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalledTimes(4);
		});

		it('should return the timer instance for chaining', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			const result = timer.start();

			expect(result).toBe(timer);
		});

		it('should do nothing if the timer is already running', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			timer.start();
			const returnedTimer = timer.start(); // Call start again

			expect(callback).toHaveBeenCalledTimes(1); // Should still only be called once
			expect(returnedTimer).toBe(timer);
		});
	});

	describe('stop()', () => {
		it('should stop the interval from calling the callback', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			timer.start();
			expect(callback).toHaveBeenCalledTimes(1);

			timer.stop();

			// Advance time, callback should not be called again
			vi.advanceTimersByTime(2000);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should return the timer instance for chaining', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			timer.start();
			const result = timer.stop();

			expect(result).toBe(timer);
		});

		it('should do nothing if the timer is not running', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			// Timer not started
			const result = timer.stop();

			expect(result).toBe(timer);
			// No errors should be thrown
		});
	});

	describe('restart()', () => {
		it('should stop and then start the timer', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			// Start initially
			timer.start();
			expect(callback).toHaveBeenCalledTimes(1);

			// Advance time by one interval
			vi.advanceTimersByTime(500);
			expect(callback).toHaveBeenCalledTimes(2);

			// Restart the timer
			timer.restart();

			// Callback should be called immediately on restart
			expect(callback).toHaveBeenCalledTimes(3);

			// Advance time, should continue at the normal interval
			vi.advanceTimersByTime(500);
			expect(callback).toHaveBeenCalledTimes(4);
		});

		it('should return the timer instance for chaining', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			const result = timer.restart();

			expect(result).toBe(timer);
		});
	});

	describe('isActive()', () => {
		it('should return true when the timer is running', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			timer.start();

			expect(timer.isActive()).toBe(true);
		});

		it('should return false when the timer is not running', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			expect(timer.isActive()).toBe(false); // Initially not running

			timer.start();
			timer.stop();

			expect(timer.isActive()).toBe(false); // Not running after stop
		});
	});

	describe('getDuration()', () => {
		it('should return 0 when the timer is not running', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			expect(timer.getDuration()).toBe(0);

			timer.start();
			timer.stop();

			expect(timer.getDuration()).toBe(0);
		});

		it('should return the elapsed time since start when the timer is running', () => {
			const callback = vi.fn();
			const timer = new IntervalTimer(callback, 500);

			// Mock Date.now to return controlled values
			const originalDateNow = Date.now;
			const startTime = 1000;

			try {
				let now = startTime;
				Date.now = vi.fn(() => now);

				timer.start();

				// Simulate time passing
				now = 1500; // 500ms later
				expect(timer.getDuration()).toBe(500);

				now = 2250; // 1250ms from start
				expect(timer.getDuration()).toBe(1250);
			} finally {
				// Restore original Date.now
				Date.now = originalDateNow;
			}
		});
	});
});
