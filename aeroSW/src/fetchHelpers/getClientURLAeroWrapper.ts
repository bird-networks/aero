import type { ResultAsync, Err } from "neverthrow";
import { errAsync as nErrAsync, okAsync } from "neverthrow";
import { fmtNeverthrowErr } from "$shared/fmtErr";

import { afterPrefix } from "$util/getProxyURL";

// Utility
import getClientUrlThroughClient, {
	getClientUrlThroughForcedReferrer
} from "./getClientURL";

import type { rewrittenParamsOriginalsType } from "$types/commonPassthrough";

export interface GetClientURLAeroWrapperArgs {
	reqUrl: URL;
	reqHeaders: Headers;
	clientId: string;
	catchAllClientsValid: boolean;
	isNavigate: boolean;
	rewrittenParamsOriginals: rewrittenParamsOriginalsType;
}

/**
 * Wraps `getClientURL.ts` to be used in aero, with the context of the current aero SW handler being used accordingly with catch-all interception methods.
 * In order to use this function, you must have the feature flag `REQ_INTERCEPTION_CATCH_ALL` set to either `clients` or `referrer`. Prefer `clients` if you can (you must be using a SW).
 * You must also have a config in the global scope of the SW defined under `self.aeroConfig` with `aeroConfig.searchParamOptions.referrerPolicy` defined as any `string` if you are using the referrer method. Please read the aero docs page about forced-referrer if you want to learn more.
 * @param param0 The passthrough object needed to get the client URL
 * @returns The client URL wrapped in a `ResultAsync` object from *Neverthrow*
 *
 * @example
 * import { fmtNeverthrowErr } from "$shared/fmtErr";
 *
 * //*..(somewhere in the SW handler)
 * const clientUrlRes = await getClientURLAeroWrapper({
 * 	reqUrl: req.url,
 * 	reqHeaders: req.headers,
 * 	reqParams: new URL(req.url).searchParams,
 * 	clientId: event.clientId,
 * 	catchAllClientsValid: REQ_INTERCEPTION_CATCH_ALL === "clients" && event.clientId !== "",
 * 	isNavigate: req.mode === "navigate" && ["document", "iframe"].includes(req.destination)
 * })
 * if (clientUrlRes.isErr()) {
 * 	return fmtNeverthrowErr("Failed to get the client URL", clientUrlRes.error);
 * }
 */
export default async function getClientURLAeroWrapper(
	pass: GetClientURLAeroWrapperArgs
): Promise<ResultAsync<string, Error>> {
	const {
		reqUrl,
		reqHeaders,
		clientId,
		catchAllClientsValid,
		isNavigate,
		rewrittenParamsOriginals
	} = pass;

	/** The URL from the client's window */
	let clientUrl: URL | undefined;

	if (isNavigate) {
		clientUrl = new URL(
			afterPrefix(reqUrl.href, self.aeroConfig?.prefix, self.logger)
		);
	} else {
		// This block handles non-navigation requests (!isNavigate)
		if (REQ_INTERCEPTION_CATCH_ALL === "clients") {
			logger.debug(
				"Attempting catch-all interception through clients for non-navigation request"
			);
			// catchAllClientsValid ensures clientId is present when REQ_INTERCEPTION_CATCH_ALL === "clients"
			if (!catchAllClientsValid) {
				return nErrAsync(
					new Error(
						"Client ID is missing or invalid; required for 'clients' interception method for non-navigation requests."
					)
				);
			}
			const clientUrlRes = await getClientUrlThroughClient(clientId);
			if (clientUrlRes.isErr()) {
				// fmtNeverthrowErr is called with async = false (default), so it returns Err<unknown, Error>
				const formattedErrResult: Err<unknown, Error> =
					fmtNeverthrowErr(
						"Failed to get client URL via 'clients' method",
						clientUrlRes.error
					) as Err<unknown, Error>;
				return nErrAsync(formattedErrResult.error);
			}
			clientUrl = clientUrlRes.value;
		} else if (REQ_INTERCEPTION_CATCH_ALL === "referrer") {
			logger.debug(
				"Attempting catch-all interception through forced referrers for non-navigation request"
			);
			// Note: getClientUrlThroughForcedReferrer is currently not implemented and will return an error.
			const clientUrlRes = await getClientUrlThroughForcedReferrer({
				params: reqUrl.searchParams,
				referrerPolicyParamName:
					aeroConfig.searchParamOptions?.referrerPolicy ||
					"x-aero-referrer-policy-override",
				// Getting the passed-through actual referrer policy
				referrerPolicy: reqHeaders.get("referer") || "no-referrer",
				rewrittenParamsOriginals
			});
			if (clientUrlRes.isErr()) {
				const formattedErrResult: import("neverthrow").Err<
					unknown,
					Error
				> = fmtNeverthrowErr(
					"Failed to get the client URL through the forced referrer policy",
					clientUrlRes.error
				) as import("neverthrow").Err<unknown, Error>;
				return nErrAsync(formattedErrResult.error);
			}
			clientUrl = clientUrlRes.value;
		} else {
			// This is the fallback error if REQ_INTERCEPTION_CATCH_ALL is not "clients" or "referrer" for a non-navigation request
			const formattedErrResult: import("neverthrow").Err<unknown, Error> =
				fmtNeverthrowErr(
					"No catch-all interception types found for non-navigation request, and rewrite-url is currently unsupported. Ensure REQ_INTERCEPTION_CATCH_ALL is correctly configured.",
					new Error(
						"Unsupported request interception backend for non-navigation request."
					)
				) as import("neverthrow").Err<unknown, Error>;
			return nErrAsync(formattedErrResult.error);
		}
	}

	// Sanity checks for clientUrl
	if (!clientUrl) {
		let errorMessage = "Client URL could not be determined.";
		if (isNavigate) {
			errorMessage +=
				" For navigation requests, this may be due to the relevant TODO not being implemented.";
		} else {
			errorMessage +=
				" For non-navigation requests, ensure REQ_INTERCEPTION_CATCH_ALL is correctly set to 'clients' (and a client ID is available) or 'referrer' (though 'referrer' method is not yet implemented).";
		}
		return nErrAsync(new Error(errorMessage));
	}

	if (clientUrl) {
		// Ignore content scripts from extensions
		if (clientUrl.protocol === "chrome-extension:") {
			logger.debug("Ignoring content script");
			return okAsync("skip");
		}
		// Ignore view source
		if (clientUrl.protocol === "view-source:") {
			logger.debug("Ignoring view source");
			return okAsync("skip");
		}
		// Sanity check
		if (!clientUrl.protocol.startsWith("http")) {
			// TODO: Support custom protocols (web+...)
			return nErrAsync(
				new Error(
					`Unknown protocol used: ${clientUrl.protocol}. Full URL: ${clientUrl.href}.`
				)
			);
		}
	} else {
		// TODO: Define this error earlier and import it here
		return nErrAsync(new Error("Your browser doesn't support 'client.url"));
	}

	// Return the client URL if we have one
	return okAsync(clientUrl.href);
}
