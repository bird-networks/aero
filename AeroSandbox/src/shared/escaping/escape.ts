/**
 * @module
 * This module contains functions for escaping in proxies.
 * Not all of these exports are meant to be used inside of aero's SW, but some are. These include: `default` (escape) and `escapeWithOrigin`.
*/

import { proxyLocation } from "../proxyLocation";
import type { eitherLogger } from "$types/loggers";
import { ok as nOk, err as nErr, Result } from "neverthrow";

/**
 * Forms a RegExp that can be used to escape a string with underscores and possibly with the origin as a prefix before the underscore
 * @param str The string to escape
 * @param origin Optionally, you can provide an origin to escape with. Likely `...proxifiedLocation.origin`
 * @returns The formed RegExp
 */
export default function (str: string, origin = ""): RegExp {
	return RegExp(`^(?:${origin}_+)?${str}$`, "g");
}

/**
 * Escape a string with an origin in the prefix; useful for isolation
 * @param str The string to escape
 * @param prefix The proxy prefix to escape with. Usually `$aero.config.prefix`.
 * @param origin Defaults to the current proxy origin. Usually `...proxifiedLocation.origin`
 * @returns The escaped string with the origin
 **/
export function escapeWithOrigin(
	str: string,
	prefix = $aero.config.prefix,
	logger: eitherLogger = $aero.logger,
	origin = proxyLocation(prefix, logger).origin
): string {
	return `${origin}_${str}`;
}

/**
 * Unescape a string that was escaped with an origin prefix
 * @param str The string with the prefix to remove
 * @param prefix The proxy prefix to escape with. Usually `$aero.config.prefix`.
 * @param origin Defaults to the current proxy origin. Usually `...proxifiedLocation.origin`
 * @returns The unescaped string with the origin
 */
export function unescapeWithOrigin(
	str: string,
	prefix = $aero.config.prefix,
	logger: eitherLogger = $aero.logger,
	origin = proxyLocation(prefix, logger).origin
): string {
	return str.replace(new RegExp(`^${origin}_`), "");
}

/*
 * Class member key escaping is for when you want to proxify a class and you want to do something depending on what the constructor is, but you can't determine how the class was constructed earlier. A good example of this is in `xhr.ts` how the XHR methods work should behave differently if sync is enabled, which the browser knows when they process the XHR, but it isn't publicly visible through the XHR class itself
 */
export function createEscapePropGetHandler(): Result<(escapedProps: readonly string[]) => ProxyHandler<any>, Error> {
	if (typeof AERO_CLASS_MEMBER_ESCAPE_KEYWORD === "undefined" || AERO_CLASS_MEMBER_ESCAPE_KEYWORD === "") {
		return nErr(new Error("Global constant AERO_CLASS_MEMBER_ESCAPE_KEYWORD is not defined or is empty. Cannot create escape property handler."));
	}
	const classMemberEscapeKeyword = AERO_CLASS_MEMBER_ESCAPE_KEYWORD;

	return nOk((escapedProps: readonly string[]): ProxyHandler<any> => ({
		get(target: any, prop: string | symbol, receiver: any): any {
			const stringProp = String(prop);
			if (escapedProps.includes(stringProp)) {
				const unescapeResult = unescape(stringProp, { keyword: classMemberEscapeKeyword });
				if (unescapeResult.isErr()) {
					$aero.logger.warn(`Failed to unescape property "${stringProp}": ${unescapeResult.error.message}`);
					// Fallback: return original property or let Reflect.get handle it as if not specially processed
					return Reflect.get(target, prop, receiver);
				}
				return unescapeResult.value;
			}
			return Reflect.get(target, prop, receiver);
		},
		set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
			const stringProp = String(prop);
			if (escapedProps.includes(stringProp)) {
				const escapeResult = escapeGetTrap(target, stringProp, { keyword: classMemberEscapeKeyword });
				if (escapeResult.isErr()) {
					$aero.logger.warn(`Failed to create escaped key for property "${stringProp}": ${escapeResult.error.message}`);
					// Fallback: set original property, or potentially skip. Must return boolean.
					return Reflect.set(target, prop, value, receiver);
				}
				return Reflect.set(target, escapeResult.value, value, receiver);
			}
			return Reflect.set(target, prop, value, receiver);
		}
	}));
}

/**
 * Escapes a property key for an object.
 * Relies on ESCAPE_METHOD, ESCAPE_KEYWORD being global constants.
 * Returns a Result type.
 */
export function escapeGetTrap(
	target: any,
	prop: string,
	escapeOptions: EscapeWithKeywordOptions
): Result<string, Error> {
	const { keyword } = escapeOptions;

	if (typeof ESCAPE_METHOD === "undefined" || typeof ESCAPE_KEYWORD === "undefined") {
		return nErr(new Error("Missing global feature flags: ESCAPE_METHOD or ESCAPE_KEYWORD. Unable to determine how properties should be escaped."));
	}

	if (ESCAPE_METHOD === "RegExp") {
		return nErr(new Error('The ESCAPE_METHOD "RegExp" is a STUB for escapeGetTrap. Please set it to "JS".'));
	}

	if (ESCAPE_KEYWORD === "JS") {
		for (let currentDepth = 1; currentDepth <= 100; currentDepth++) {
			const potentialKey = keyword.repeat(currentDepth) + prop;
			if (!(potentialKey in target) || target[potentialKey] === undefined) {
				return nOk(potentialKey);
			}
		}
		return nErr(new Error(`Could not find unique escaped key for "${prop}" after 100 attempts.`));
	}
	return nErr(new Error(`Unknown ESCAPE_KEYWORD "${ESCAPE_KEYWORD}" or ESCAPE_METHOD "${ESCAPE_METHOD}".`));
}

/**
 * Unescapes a property key.
 * Relies on ESCAPE_METHOD, ESCAPE_KEYWORD being global constants.
 * Returns a Result type.
 */
export function unescape(str: string, escapeOptions: EscapeWithKeywordOptions): Result<string, Error> {
	const { keyword } = escapeOptions;

	if (typeof str !== "string") {
		// This case should ideally not be reached if called from within the handler with String(prop)
		return nErr(new Error(`Attempted to unescape non-string value: ${String(str)}`));
	}

	if (typeof ESCAPE_METHOD === "undefined" || typeof ESCAPE_KEYWORD === "undefined") {
		return nErr(new Error("Missing global feature flags: ESCAPE_METHOD or ESCAPE_KEYWORD. Unable to determine how properties should be unescaped."));
	}

	if (ESCAPE_METHOD === "RegExp") {
		return nErr(new Error('The ESCAPE_METHOD "Regexp" is a STUB, so please set it to JS instead'));
	}

	if (ESCAPE_METHOD === "JS") {
		const parts = str.split(keyword);
		const unescaped = parts.pop();
		if (unescaped === undefined) {
			// This could happen if str is identical to keyword, or empty after split by keyword
			return nErr(new Error(`Failed to unescape string "${str}" with keyword "${keyword}": pop returned undefined.`));
		}
		return nOk(unescaped);
	}
	return nErr(new Error(`Unknown ESCAPE_METHOD "${ESCAPE_METHOD}".`));
}
