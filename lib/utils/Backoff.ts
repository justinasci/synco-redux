/**
 * Schedules a single pending callback with an exponentially growing, capped delay
 */
export class Backoff {
	private timerId: ReturnType<typeof setTimeout> | undefined;
	private attempts = 0;

	/**
	 * @param baseDelay Delay of the first attempt in milliseconds, doubles on each attempt
	 * @param maxDelay Maximum delay in milliseconds
	 */
	constructor(
		private readonly baseDelay: number,
		private readonly maxDelay: number
	) {}

	/**
	 * Whether a callback is waiting to run
	 */
	get isPending(): boolean {
		return this.timerId !== undefined;
	}

	/**
	 * Schedules the callback after the next delay, does nothing if one is already pending
	 * @returns The delay in milliseconds, or undefined if a callback is already pending
	 */
	schedule(callback: () => void): number | undefined {
		if (this.isPending) {
			return undefined;
		}

		const delay = Math.min(this.baseDelay * 2 ** this.attempts, this.maxDelay);
		this.attempts++;

		this.timerId = setTimeout(() => {
			this.timerId = undefined;
			callback();
		}, delay);

		return delay;
	}

	/**
	 * Cancels the pending callback, keeps the attempt count
	 */
	cancel(): void {
		clearTimeout(this.timerId);
		this.timerId = undefined;
	}

	/**
	 * Resets the delay back to the base delay
	 */
	reset(): void {
		this.attempts = 0;
	}
}
