/**
 * @module
 * This module contains generic code used by both aero and AeroSandbox's build system
 */

import type { Result, ResultAsync } from "neverthrow";
import { err as nErr, errAsync as nErrAsync, ok as nOk, okAsync } from "neverthrow";

import Logger from "./Logger";

import InitDist from "../scripts/InitDist";
import genWebIDL from "../scripts/initApiTypes";
import initApis from "../scripts/initApis";

import type { FeatureFlags } from "./featureFlags";

import importSync from "import-sync";

interface Dirs {
	dist: string;
	proper: string;
}
interface MiscRequiredArgs {
	verboseMode: boolean;
	// TODO: Import this type instead
	properDirType: "debug" | "prod";
}

// Removed module-level logger that relied on global DEBUG

/**
 * This method runs all of the scripts in the scripts directory for AeroSandbox
 */
export async function initAll(
	requiredDirs: Dirs,
	miscRequiredArgs: MiscRequiredArgs
): Promise<Result<void, Error>> {
	const { dist: distDir, proper: properDir } = requiredDirs;
	const { verboseMode, properDirType } = miscRequiredArgs;

	// This specific logger can use verboseMode if a different level of detail is needed for initAll steps
	// Or it could also use the global DEBUG. For now, let's use verboseMode as passed.
	const initAllStepLogger = new Logger(verboseMode);

	const initDist = new InitDist(
		{
			dist: distDir,
			proper: properDir,
		},
		properDirType,
		verboseMode
	);

	initAllStepLogger.log("Initializing the dist folder...");

	const initDistRes = await initDist.init();
	if (initDistRes.isErr()) {
		const actualResult = await initDistRes;
		if (actualResult.isErr()) return nErr(actualResult.error);
	}

	// genWebIDL and initApis might use their own loggers internally which would pick up global DEBUG
	// or they accept logStatus/verboseMode parameters.
	const genWebIDLRes = genWebIDL(miscRequiredArgs.verboseMode); // Pass verboseMode as logStatus
	if (genWebIDLRes.isErr()) {
		return nErr(genWebIDLRes.error);
	}

	// initApis will use global DEBUG for its iterator's logger.
	// Pass verboseMode for its logStatus parameter.
	const initApisRes = initApis(undefined, undefined, miscRequiredArgs.verboseMode);
	if (initApisRes.isErr()) {
		return nErr(initApisRes.error);
	}

	return nOk(undefined);
}

export function importFeatureFlagOverrides(): Result<Partial<FeatureFlags>, Error> {
	try {
		const featureFlagOverrides = importSync("./createFeatureFlags.ts").default;
		return nOk(featureFlagOverrides);
	} catch (err) {
		return nErr(err as Error);
	}
}

/**
 * This class is a helper for handling Neverthrow errors
 * @example
 * import { ErrUnwrapper } from "...";
 *
 * const debugMode = process.env.DEBUG;
 * ...
 * const errUnwrapper = new ErrUnwrapper(debugMode);
 */
export class ErrUnwrapper {
	/**
	 * This will handle a Neverthrow `Result` and throw an error how it should be thrown accordingly
	 * @param res The result to handle
	 * @param msgDesc The description proceeding the actual returned error
	 * @param debugMode Should the error be thrown or logged?
	 * @param msgPreview The indicator proceeding the description
	 * @example
	 * errUnwrapper(func(), "Unable to do ...(something)");
	 */
	// biome-ignore lint/suspicious/noExplicitAny: this is intentionally generic
	// deno-lint-ignore no-explicit-any
	unwrap(
		res: Result<any | void, Error>,
		msgDesc: string,
		// Default debugMode for ErrUnwrapper can be the global DEBUG
		debugMode = typeof DEBUG !== "undefined" ? DEBUG : true,
		msgPreview = "⚠️ "
	): void {
		if (res.isErr()) {
			const err = res.error;
			if (!debugMode) {
				console.warn(`${msgPreview}${msgDesc}${err.message}`);
			} else {
				console.warn(`${msgPreview}`);
				throw err;
			}
		}
	}
}
