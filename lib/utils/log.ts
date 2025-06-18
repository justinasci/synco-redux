export interface ILogger {
	log: typeof console.log;
	warn: typeof console.warn;
	info: typeof console.info;
	error: typeof console.error;
}

export const Logger: ILogger = {
	log: (...args: unknown[]) => console.log(getLogPrefix(), ...args),
	warn: (...args: unknown[]) => console.warn(getLogPrefix(), ...args),
	info: (...args: unknown[]) => console.info(getLogPrefix(), ...args),
	error: (...args: unknown[]) => console.error(getLogPrefix(), ...args)
};

export const SilentLogger: ILogger = {
	...Logger,
	log: () => {},
	info: () => {}
};
const formattedDateTime = (timestamp: number): string => {
	const date = new Date(timestamp);
	return (
		date.toLocaleString('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}) + `.${date.getMilliseconds().toString().padStart(3, '0')}`
	);
};

const getLogPrefix = () => {
	return '\x1b[1m[SyncoRedux]\x1b[0m ' + `[${formattedDateTime(Date.now())}]`;
};
