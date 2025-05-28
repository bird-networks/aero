/**
 * @module
 * These methods allow the API Interceptors to get the proxy URL from the real URL
 * Please look at the Index of the Dev Docs to understand the difference between a proxy URL and a real URL
 * This is meant for getting the proxy URL when you are in the client, however it has some uses in aero's SW as well.
 */

import type { eitherLogger } from "$types/loggers";

/**
 * Separates the prefix from the url to get the proxy url isolated (undoes the URL rewriting for us to disect and handle accordingly)
 * This is primarily used for concealers
 * @param realURL Likely `location.href`
 * @param prefix Likely `aeroConfig.prefix`
 * @param logger The logger to use for logging
 * @returns The URL after the prefix
 */
function afterPrefix(
	realURL: string,
	prefixParam?: string,
	loggerParam?: eitherLogger
): string {
	// Prioritize passed parameters, then SW context (self/globalThis), then $aero global
	const usedPrefix =
		prefixParam ??
		globalThis.aeroConfig?.prefix ??
		globalThis.prefix ??
		globalThis?.$aero?.config?.prefix;
	const usedLogger =
		loggerParam ?? globalThis.logger ?? globalThis?.$aero?.logger;

	if (!usedLogger) {
		console.warn(
			"[afterPrefix] The logger is undefined. Cannot log URL transformation."
		);
		if (!usedPrefix) {
			console.warn(
				"[afterPrefix] The prefix is undefined. URL rewriting may be incorrect."
			);
		}
		const proxyURL = realURL.replace(
			new RegExp(`^(${location.origin}${usedPrefix || ""})`, "g"), // Use empty string if usedPrefix is still undefined
			""
		);
		return proxyURL;
	}

	const proxyURL = realURL.replace(
		new RegExp(`^(${location.origin}${usedPrefix})`, "g"),
		""
	);
	usedLogger.log(
		`[afterPrefix] ${realURL} -> ${proxyURL} (Real URL -> Proxy URL conversion using prefix: ${usedPrefix})`
	);
	return proxyURL;
}

/**
 * Get whatever is after the current document's origin in a URL (usually to get the proxy URL)
 * @param realURL - The URL to get (likely) the proxy URL from
 * @returns The URL after the current document's origin
 */
function afterOrigin(realURL: string): string {
	return realURL.replace(new RegExp(`^(${location.origin})`, "g"), "");
}

export { afterOrigin, afterPrefix };
