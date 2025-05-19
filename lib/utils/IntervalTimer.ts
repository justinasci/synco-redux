/**
 * A utility class that wraps setInterval with start/stop functionality
 */
export class IntervalTimer {
	private timerId: ReturnType<typeof setInterval> | null = null;
	private startTime: number = 0;
	private readonly callback: () => void;
	private readonly interval: number;
	private isRunning: boolean = false;

	/**
	 * Creates a new interval timer
	 * @param callback Function to call on each interval
	 * @param interval Interval in milliseconds
	 */
	constructor(callback: () => void, interval: number) {
		this.callback = callback;
		this.interval = interval;
	}

	/**
	 * Starts the interval timer
	 * @returns This timer instance for chaining
	 */
	start(): IntervalTimer {
		if (this.isRunning) {
			return this;
		}

		this.isRunning = true;
		this.startTime = Date.now();

		// Execute callback immediately on start
		this.callback();

		// Set up the interval
		this.timerId = setInterval(this.callback, this.interval);

		return this;
	}

	/**
	 * Stops the interval timer
	 * @returns This timer instance for chaining
	 */
	stop(): IntervalTimer {
		if (!this.isRunning) {
			return this;
		}

		if (this.timerId) {
			clearInterval(this.timerId);
			this.timerId = null;
		}

		this.isRunning = false;

		return this;
	}

	/**
	 * Restarts the interval timer
	 * @returns This timer instance for chaining
	 */
	restart(): IntervalTimer {
		this.stop();
		return this.start();
	}

	/**
	 * Checks if the timer is currently running
	 * @returns Whether the timer is running
	 */
	isActive(): boolean {
		return this.isRunning;
	}

	/**
	 * Gets the duration the timer has been running
	 * @returns Duration in milliseconds, or 0 if not running
	 */
	getDuration(): number {
		if (!this.isRunning) {
			return 0;
		}

		return Date.now() - this.startTime;
	}
}
