import type { Result } from "neverthrow";
import { err as nErr, ok as nOk } from "neverthrow";

import type AeroConfig from "../types/config.js";

import RewriterGeneric from "./RewriterGeneric";

/**
 * Do not import this; use `AeroGel`
 */
export default class AeroGelGeneric extends RewriterGeneric {
	constructor(config: AeroConfig) {
		super(config);
	}
	applyNewConfig(config: AeroConfig) {
		super.applyNewConfig(config);
	}
	// @ts-ignore: This is meant to be generic
	jailScript(
		script: string,
		isModule: boolean,
		config: AeroConfig,
		rewriteScript: Function,
	): Result<string, Error> {
		//@ts-ignore: This should be defined in any class that extends this
		const rewrittenScriptRes = rewriteScript(script, {
			trackBlockDepth: config.trackers.blockDepth,
			trackPropertyChain: config.trackers.propertyChain,
			trackProxyApply: config.trackers.proxyApply,
		});
		if (rewrittenScriptRes.isErr()) {
			return nErr(
				new Error(
					`Failed to rewrite the script while trying to jail it: ${rewrittenScriptRes.error}`,
				),
			);
		}
		return nOk(/* js */ `
		!(window = ${"null"
			},
			globalThis = ${"null"
			}
			location = ${config.globalsConfig.aeroGel?.proxified?.location || "null"
			}) => {
			${isModule ? script : script},
		}();
		`);
	}
}
