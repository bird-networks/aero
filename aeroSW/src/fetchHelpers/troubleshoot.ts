// Neverthrow for improved error handling
import type { Result } from "neverthrow";
import { err as nErr, ok as nOk } from "neverthrow";
import { fmtNeverthrowErr } from "$shared/fmtErr";
// Note: aeroLoggerType not needed as logger is global
import createGenericTroubleshootingStrs from "$shared/createGenericTroubleshootingStrs";

/** Shared strings used across aero for error messages **/
// TODO: Make something like this for AeroSandbox
const genericStrs = createGenericTroubleshootingStrs(ERR_LOG_AFTER_COLON);

export const troubleshootingStrs = {
	...genericStrs,
	noFetchEventMsg: `${genericStrs.devErrTag}Can't validate the fetch event argument passed inside of aero's SW handler. This probably means you are using aero's SW handler outside of the SW, which is improper use. Perhaps you should look at the server-only docs for aero if you want to run it on the server?`,
	/** A message for when the user fails to import a bundle properly or not at all */
	tryImportingItMsg: `. Try importing the bundle. Perhaps you ordered the bundles wrong (with importScripts)?
Ensure the bundles are in this order:
	1. BareMux
	2. aero loggers (logger.js)
	4. aero's default config (defaultConfig.js)
	3. aero's config (config.js)
	5. aero's SW bundle (aeroSW.js)`,
	/** Whose fault it is for the configs not validating */
	validationTarget: DEBUG
		? "you (the proxy site developer)"
		: "the proxy site hoster",
};

/**
 * Checks for common proxy site dev problems when configuring their SW for aero and validate that everything is prepared properly for the rest of aero's SW handler
 */
export default function troubleshoot(): Result<void, Error> {
	// Sanity checks to ensure that everything has been initalized properly
	if (!("logger" in self)) {
		return nErr(
			new Error(
				`${troubleshootingStrs.devErrTag}The logger hasn't been initalized!${troubleshootingStrs.tryImportingItMsg}`,
			),
		);
	}
	if (!("BareMux" in self)) {
		throw nErr(
			new Error(
				`${troubleshootingStrs.devErrTag}There is no bare client (likely BareMux) provided!${troubleshootingStrs.tryImportingItMsg}`,
			),
		);
	}
	const troubleshootJustConfigsRes = troubleshootJustConfigs();
	if (troubleshootJustConfigsRes.isErr()) {
		// Propogate the error result up the chain (`troubleshootJustConfigs` is already meant to handle errors itself)
		return troubleshootJustConfigsRes;
	}
	return nOk(undefined);
}

export function troubleshootJustConfigs(): Result<void, Error> {
	if (!("aeroConfig" in self)) {
		if ("defaultConfig" in self) {
			return nErr(
				new Error(
					`${troubleshootingStrs.devErrTag}There is no default config provided! You need to create one other than the default.`,
				),
			);
		}
		return nErr(
			new Error(
				`${troubleshootingStrs.devErrTag}There is no config provided!${troubleshootingStrs.tryImportingItMsg}`,
			),
		);
	}
	return nOk(undefined);
}
