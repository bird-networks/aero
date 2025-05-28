/**
 * @module
 * This module can create methods that format error in a consistent way.
 * It is intended to be used in the `fmtErr.ts` files for aero and AeroSandbox and is simplify an abstraction for them
 */

import type { Err, ResultAsync } from "neverthrow";
import { err as nErr, errAsync as nErrAsync } from "neverthrow";
import createGenericTroubleshootingStrs from "./createGenericTroubleshootingStrs";

/**
 * I could've used a class for this, but I felt it would be overkill for its intended use case
 * @param errLogAfterColon A feature log to help with the formatting of the unpacked *Neverthrow* errors
 * @returns The methods for formatting *Neverthrow* errors
 *
 * @example
 * export const { fmtErr, fmtNeverthrowErr } = createErrorFmters(ERR_LOG_AFTER_COLON);
 */
const createErrorFmters = (errLogAfterColon: string) => {
	const fmtRawErr = (
		explanation: string,
		originalErrs: Error | string | readonly Error[] | readonly string[],
		customFaultTag?: string,
	): string => {
		const errsList: Error[] = (
			Array.isArray(originalErrs) ? originalErrs : [originalErrs]
		).map((err) => (typeof err === "string" ? new Error(err) : err));
		const troubleshooting = createGenericTroubleshootingStrs(errLogAfterColon);
		const tag =
			(customFaultTag ?? troubleshooting)
				? troubleshooting.aeroErrTag
				: "[AERO_ERR] ";
		return `${tag}${explanation}${errsList
			.map((err) => (err.stack ?? "").split("\n").join("\n\t"))
			.join(errLogAfterColon)}`;
	};

	return {
		/**
		 * Formats an error in a consistent way
		 * @param explanation The concise explanation of the `originalErr`
		 * @param originalErr The original error that was caught
		 * @returns The formatted error
		 */
		fmtErr(
			explanation: string,
			originalErrs: string | Error | readonly string[] | readonly Error[],
			customFaultTag?: string,
		): Error {
			return new Error(fmtRawErr(explanation, originalErrs, customFaultTag));
		},
		/**
		 * Formats a *Neverthrow* error in a consistent way
		 * This method warps `fmtErr` in a *Neverthrow* error
		 * @param explanation The concise explanation of the `originalErr`
		 * @param originalErr The original error that was caught
		 * @returns The formatted *Neverthrow* error
		 */
		fmtNeverthrowErr(
			explanation: string,
			originalErrs: Error | string | readonly Error[] | readonly string[],
			async = false,
			customFaultTag?: string,
		): Err<unknown, Error> | ResultAsync<unknown, Error> {
			const message = fmtRawErr(explanation, originalErrs, customFaultTag);
			const wrappedErr = new Error(message);
			if (async) return nErrAsync(wrappedErr);
			return nErr(wrappedErr);
		},
		fmtRawErr,
	};
};
export default createErrorFmters;
