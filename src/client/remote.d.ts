declare module 'loglevel-plugin-remote' {
	import {Logger, LogLevel} from "loglevel";

	const remote: Remote
	export = remote
	interface Remote {
		apply(logger: Logger, options: RemoteOptions) : void;
	}

	interface RemoteOptions {
		url: string
		method?: string
		token?: string
		level?: LogLevel
		format: (log: any) => any
	}
}