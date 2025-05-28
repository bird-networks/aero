/**
 * These types assume that you have already imported the Logger and BareMux bundle.
 */
// TODO: Import this in the global scope of handleSW.ts

import type { Config } from "$aero/types/config";
import type { default as BareMux_ } from "@mercuryworkshop/bare-mux";
import type { AeroLogger } from "$aero/AeroSandbox/build/Logger";

declare global {
	var config: Config;
	var aeroConfig: Config;
	var BareMux: BareMux_;
	var handle: unknown; // Replace with actual type
	var logger: AeroLogger;
	var nestedSWs: Map<proxyOrigin, NestedSW[]>;
	var storedValsForSandbox: { [key: string]: any };
	var CACHES_EMULATION: boolean;
	var FEATURES_CORS_EMULATION: boolean;
	var ENC_BODY_EMULATION: boolean;
	var SUPPORT_SPECULATION: boolean;
	var SECURITY_POLICY_EMULATION: boolean;
	var REQ_INTERCEPTION_CATCH_ALL: string;
	var SERVER_ONLY: boolean;
	var DEBUG: boolean;
	var ERR_LOG_AFTER_COLON: string;
	var getReqDest: (destination: string, params: URLSearchParams) => string;
	var serverFetch: (
		input: RequestInfo,
		init?: RequestInit
	) => Promise<Response>;
	var electronWebViewControls: {
		httpReferrer?: string;
		useragent?: string;
	};
	var aeroHandle: (
		event: FetchEvent
	) => Promise<ResultAsync<Response, Error>>;
	var routeAero: (event: FetchEvent) => Result<boolean, Error>;
	var Assert: unknown;
}
