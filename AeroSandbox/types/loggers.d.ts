import type { AeroLogger, AeroSandboxLogger } from "../src/shared/Loggers";

/** A union of all Logger classes */
export type eitherLogger = AeroLogger | AeroSandboxLogger;

/** For HTML templating on fatal errors */
export type htmlTemplatingCallbackType = (errMsg: string) => string;

/** Options for Logger constructors */
export interface LoggerOptions {
	htmlTemplatingCallback?: htmlTemplatingCallbackType;
}
