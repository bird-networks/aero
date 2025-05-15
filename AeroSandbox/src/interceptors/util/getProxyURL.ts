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
 * @param 
*/
function afterPrefix(
	realURL: string,
	prefix?: string,
	logger?: eitherLogger
) {
	const usedPrefix = prefix ?? $aero.config.prefix;
	const usedLogger = logger ?? $aero.logger;
	// debug log suppressed to avoid incorrect signature call
	return realURL.replace(
		new RegExp(`^(${location.origin}${usedPrefix})`, "g"),
		""
	);
}

/**
 * Get whatever is after the current document's origin in a URL (usually to get the proxy URL)
 * @param realURL - The URL to get (likely) the proxy URL from
 * @returns The URL after the current document's origin
*/
function afterOrigin(realURL: string): string {
	return realURL.replace(new RegExp(`^(${location.origin})`, "g"), "");
}

export { afterPrefix, afterOrigin };
