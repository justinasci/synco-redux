/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Interface for loggers that can be used throughout the application
 */
export interface ILogger {
	/**
	 * Log an informational message
	 * @param message The main message to log
	 * @param args Additional arguments to log
	 */
	log(message: string, ...args: unknown[]): void;

	/**
	 * Log an error message
	 * @param message The main error message
	 * @param args Additional arguments to log
	 */
	error(message: string, ...args: unknown[]): void;

	/**
	 * Log a warning message
	 * @param message The main warning message
	 * @param args Additional arguments to log
	 */
	warn?(message: string, ...args: unknown[]): void;

	/**
	 * Log a debug message
	 * @param message The main debug message
	 * @param args Additional arguments to log
	 */
	debug?(message: string, ...args: unknown[]): void;
}
