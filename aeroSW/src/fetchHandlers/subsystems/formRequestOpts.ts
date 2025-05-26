// Neverthrow
import type { ResultAsync } from "neverthrow";
import { errAsync, okAsync } from "neverthrow";
import { fmtNeverthrowErr } from "$shared/fmtErr";

// Utility
import rewriteReqHeaders from "$rewriters/reqHeaders";
import rewriteRespHeaders from "$rewriters/reqHeaders";

/**
 * This does header rewriting too
 * @param pass
 * @returns An object containing every thing that is needed to continue, including the rewritten request and the client URL for later processing in `response.ts`
 */
export default async function rewriteReq({
	req,
	clientUrl,
	proxyUrl,
	bc,
}: {
	req: Request;
	clientUrl: string;
	proxyUrl: URL;
	bc: any;
}): Promise<ResultAsync<RequestInit, Error>> {
	// Clone headers to avoid modifying original request
	const rewrittenReqHeaders = new Headers(req.headers);

	const rewrittenReqHeadersRes = await rewriteReqHeaders(
		rewrittenReqHeaders,
		{
			proxyUrl,
			clientUrl: new URL(clientUrl),
			bc,
		},
	);
	if (rewrittenReqHeadersRes.isErr()) {
		return fmtNeverthrowErr(
			"Failed to rewrite the request headers",
			rewrittenReqHeadersRes.error,
		);
	}

	/** The request options, but rewritten to be proxified for aero */
	const rewrittenReqOpts: RequestInit = {
		method: req.method,
		headers: rewrittenReqHeaders,
	};

	// A request body should not be created under these conditions
	if (!["GET", "HEAD"].includes(req.method)) rewrittenReqOpts.body = req.body;

	return okAsync(rewrittenReqOpts);
}
