// For better type safety
/// Neverthrow
import type { ResultAsync } from "neverthrow";
import { okAsync } from "neverthrow";
import { fmtNeverthrowErr } from "$shared/fmtErr";

// Types for passthrough
import type { WebViewControls } from "$sandboxTypes/electronPassthrough";
/// BareMux
import BareMux from "@mercuryworkshop/bare-mux";

import injFmtWrapper from "$swUtil/injFmtWrapper";
// Preprocessor
import mainFmtHTML from "$jsrewriter/preprocessors/mainInjBundle/mainFmtHTML.val";
import mainInjFmtXSLT from "$jsrewriter/preprocessors/mainInjBundle/mainFmtXSLT.val";

// Utility
import isHTML from "$util/isHTML";
import escapeJS from "$swUtil/escapeJS";

// Resp Rewriters
import rewriteRespHeaders from "$rewriters/respHeaders";
import rewriteCacheManifest from "$rewriters/cacheManifest";
import rewriteManifest from "$rewriters/webAppManifest";
//import JSRewriter from "$jsrewriter/JSRewriter";

import type { Sec } from "$aero/aeroSW/types";
import type { rewrittenParamsOriginalsType } from "$types/commonPassthrough";

//const jsRewriter = new JSRewriter(aeroConfig.sandbox.jsParserConfig);

/**
 * Rewrites the response with the content rewriters and the response headers rewriter
 * @param param0 The passthrough object needed for the cache setting
 * @returns
 */
export default async function rewriteResp(
	pass: Readonly<{
		originalResp: Response;
		rewrittenReqHeaders: Headers;
		/** If you are making a server-only implementation, you could infer this from the mime type and file type */
		reqDestination: string;
		proxyUrl: URL;
		clientUrl: string;
		isScript: boolean;
		isNavigate: boolean;
		isMod: boolean;
		sec: Sec;
		/** This is for `No-Vary-Search` rewriting */
		rewrittenParamsOriginals: rewrittenParamsOriginalsType;
		electronWebViewControls?: Readonly<WebViewControls>;
	}>,
	accessControlRuleMap: Map<string, string>
): Promise<
	ResultAsync<
		{
			rewrittenBody: string | ReadableStream;
			rewrittenRespHeaders: Headers;
			rewrittenStatus: number;
		},
		Error
	>
> {
	const {
		originalResp,
		rewrittenReqHeaders,
		reqDestination,
		proxyUrl,
		clientUrl,
		isScript,
		isNavigate,
		isMod,
		sec,
		rewrittenParamsOriginals
	} = pass;

	// Rewrite the response headers
	const destructedRespHeaders = { ...originalResp.headers };
	const reconstructedRespHeaders = new Headers(destructedRespHeaders);
	const rewrittenRespHeadersRes = await rewriteRespHeaders(
		reconstructedRespHeaders,
		rewrittenParamsOriginals,
		accessControlRuleMap,
		{
			proxyUrl,
			clientId: clientUrl,
			bc: new BareMux()
		}
	);
	if (rewrittenRespHeadersRes.isErr()) {
		return fmtNeverthrowErr(
			"Failed to rewrite the response",
			rewrittenRespHeadersRes.error
		);
	}
	const { speculationRules, sourcemapPath } = rewrittenRespHeadersRes.value;

	const type = originalResp.headers.get("content-type");

	// For modules
	const isModWorker =
		new URLSearchParams(location.search).get("isMod") === "true";

	/** If the request is meant to be to an HTML webpage */
	const html =
		// Not all sites respond with a type
		typeof type === "undefined" || isHTML(type || "");

	// Initialize variables that are used throughout the function
	const rewrittenStatus = originalResp.status;
	// Define integrityMainCheck function
	const integrityMainCheck = (isMod: boolean) => `
		// Integrity check for ${isMod ? "module" : "script"}
		console.log('Integrity check passed');
	`;

	let rewrittenBody: string | ReadableStream;
	// Rewrite the body
	if (REWRITER_HTML && isNavigate && html) {
		const body = await originalResp.text();
		const rewrittenBodyBeforeImportRes = injFmtWrapper(
			mainFmtHTML({ DEBUG: Boolean(DEBUG) }).code,
			{
				BUNDLES_SANDBOX_INIT: aeroConfig.bundles.sandboxInitAero,
				BUNDLES_SANDBOX_END: aeroConfig.bundles.sandboxEndAero,
				BUNDLES_LOGGER_CLIENT: aeroConfig.bundles.loggerClient,
				FORCE_INLINED_SPECULATION_RULES:
					speculationRules && speculationRules.length > 0
						? `
<script type="speculationRules">
	${speculationRules}
</script>`
						: ""
			},
			{
				CLIENT_ID: aeroConfig.clientId,
				// $aero (global proxy namespace) passthrough
				SEC: sec ? `...${JSON.stringify(sec)}` : "",
				ELECTRON_WEBVIEW_CONTROLS:
					"electronWebViewControls" in pass
						? `...${JSON.stringify(pass.electronWebViewControls)}`
						: "",
				PREFIX: aeroConfig.prefix,
				SEARCH_PARAM_OPTIONS: JSON.stringify(
					aeroConfig.searchParamOptions
				),
				// Bundles
				BUNDLES_SANDBOX_CONFIG: aeroConfig.bundles.aeroSandboxConfig,
				// Misc config options (branding, etc.)
				IMAGE_LOG:
					DEBUG || AERO_BRANDING_IN_PROD
						? `$aero.logger.image(${aeroConfig.bundles.logo})`
						: "",
				GITHUB_REPO: aeroConfig.githubRepo
			}
		);
		if (rewrittenBodyBeforeImportRes.isErr()) {
			return fmtNeverthrowErr(
				"Failed to format HTML",
				rewrittenBodyBeforeImportRes.error
			);
		}
		const rewrittenBodyBeforeImport = rewrittenBodyBeforeImportRes.value;
		// Recursion (for iframes)
		const rewrittenBodyRecursiveRes = injFmtWrapper(
			rewrittenBodyBeforeImport,
			{},
			{
				IMPORT: rewrittenBodyBeforeImport
			}
		);
		if (rewrittenBodyRecursiveRes.isErr()) {
			return fmtNeverthrowErr(
				"Failed to format HTML recursively",
				rewrittenBodyRecursiveRes.error
			);
		}
		rewrittenBody = rewrittenBodyRecursiveRes.value;
		// Finally, apply the original body untouched
		rewrittenBody += `\n${body}`;
	} else if (
		REWRITER_XSLT &&
		isNavigate &&
		(type?.startsWith("text/xml") || type?.startsWith("application/xml"))
	) {
		const body = await originalResp.text();
		rewrittenBody = body;

		// TODO: Update this to support modern aero

		rewrittenBody = `${mainInjFmtXSLT}\n${body}`;
	} else if (REWRITER_JS && isScript) {
		/*
		const script = await originalResp.text();

		let rewriteOptionsShared = {};
		if (sourcemapPath && sourcemapPath.length > 0) {
			rewriteOptionsShared = {
				sourcemapPath: sourcemapPath,
			};
		}
		if (INTEGRITY_EMULATION) {
			rewrittenBody = jsRewriter.wrapScript(script, {
				isModule: isMod,
				insertCode: /* js\ *\/ `
{
	const bak = decodeURIComponent(escape(atob(\`${escapeJS(script)}\`)));
	${integrityMainCheck(isMod)}
}
`,
				...rewriteOptionsShared,
			});
			// @ts-ignore
		} else {
			rewrittenBody = jsRewriter.wrapScript(script, {
				isModule: isMod,
				...rewriteOptionsShared,
			});
		}
		*/
	} else if (REWRITER_CACHE_MANIFEST && reqDestination === "manifest") {
		const body = await originalResp.text();

		// Safari exclusive
		if (SUPPORT_LEGACY && type?.includes("text/cache-manifest")) {
			const isFirefox =
				rewrittenReqHeaders.get("user-agent")?.includes("Firefox") ||
				false;

			rewrittenBody = rewriteCacheManifest(body, isFirefox);
		} else rewrittenBody = rewriteManifest(body, proxyUrl);
	} // TODO: Bring back worker support in aero
	else if (SUPPORT_WORKER && reqDestination === "worker") {
		const body = await originalResp.text();
		rewrittenBody = isModWorker
			? /* js */ `
	import { proxyLocation } from "${aeroConfig.aeroPrefix}worker/worker";
	import { FeatureFlags } from '../featureFlags';
	self.location = proxyLocation;
	`
			: `
	importScripts("${aeroConfig.aeroPrefix}worker/worker.js");
		
	${body}
		`;
	} else if (SUPPORT_WORKER && reqDestination === "sharedworker") {
		const body = await originalResp.text();
		rewrittenBody = isModWorker
			? /* js */ `
	import { proxyLocation } from "${aeroConfig.aeroPrefix}worker/worker";
	self.location = proxyLocation;
	`
			: /* js */ `
	importScripts("${aeroConfig.aeroPrefix}worker/worker.js");
	importScripts("${aeroConfig.aeroPrefix}worker/sharedworker.js");
	${body}
	`;
	} // No rewrites are needed; proceed as normal
	else rewrittenBody = originalResp.body || "";

	return okAsync({
		rewrittenBody,
		rewrittenRespHeaders: destructedRespHeaders,
		rewrittenStatus
	});
}
