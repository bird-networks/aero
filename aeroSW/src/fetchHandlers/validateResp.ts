/**
 * @module
 */

import type { Result } from "neverthrow";
import { ok as nOk, err as nErr } from "neverthrow";
import { fmtNeverthrowErr } from "$shared/fmtErr";

/**
 * Validates the proxy response
 * @param resp The response from the proxy
 * @returns A result indicating if the response is valid
 */
export default async function validateResp(
	resp: Response
): Promise<Result<void, Error>> {
	// TODO: Make conditional based on a feature flag for legacy CORS support with the *BareMux* library
	// TODO: Catch network errors from the proxy if legacy CORS is disabled

	if (!resp.ok && resp.status >= 400) {
		return fmtNeverthrowErr(
			"Got a network error from the proxy when fetching the site",
			new Error(`Response status: ${resp.status}`)
		);
	} else {
		return fmtNeverthrowErr(
			"Got a different kind of error from the proxy when fetching the site",
			new Error("Unknown response error")
		);
	}

	return nOk(undefined);
}
