/**
 * @module
 */

// TODO: Import Neverthrow

import type RewriterConfig from "./backends/types/config.js";

/** Configuration interface for JSRewriter top-level API */
interface AeroJSParserConfig {
	proxyNamespace: string;
	modeDefault: "aerojet" | "aerogel";
	modeModule: "aerojet" | "aerogel";
	/** Global configuration for rewriters */
	globalsConfig?: RewriterConfig["globalsConfig"];
	/** Keyword generation configuration */
	keywordGenConfig?: RewriterConfig["keywordGenConfig"];
	/** Tracker configuration */
	trackers?: RewriterConfig["trackers"];
}

interface RewriteOptions {
	isModule: boolean;
	insertCode?: string;
}

import ASTRewriter from "./backends/AeroJet";
import AeroGel from "./backends/AeroGel";

// TODO: Support map proxying, where if the Feature Flag JS_MAP_REWRITING is enabled, any changes to the JS file post-rewrite will be reflected in the Source Map. A Source Map comment directive will be added if there wasn't one already. In the SW, if there is a valid JS response for a Source Map request, I will use that Source Map against the original unrewritten response for the JS file, apply my rewriting to that, and then take the Source Map from that to reformat it. This will allow for a seamless debugging experience in the browser.
/**
 * @module
 *
 * @example
 *  // This example shows using the JS Rewriter just for AeroGel
 *  import AeroSandbox from "aero-sandbox";
 *
 *  import JSRewriter from "aero-sandbox/JSRewriter";
 *  import escapeJS from "aero-sandbox/JSRewriter/escapeJS";
 *  import integral from "aero-sandbox/JSRewriter/integralJS";
 *  // Globals
 *  window.testProxyNamespace = {};
 *
 *  // Constants
 *  const yourScript = "...";
 *  const testProxyNamespace = "testGlobalNamespace";
 *  const ourNamespace = "sandbox";
 *  const isModule = false;
 *
 *  const jsRewriter = new JSRewriter({
 *      proxyNamespace: testProxyNamespace,
 *      modeDefault: "aerogel",
 *      modeModule: "aerogel",
 *      modeConfigs: {
 *          generic: {
 *              proxyNamespace: testProxyNamespace,
 *              objPaths: {
 *                  proxy: {
 *                      fakeVars: {
 *                          let: `window["${testProxyNamespace}"]["${ourNamespace}"]aeroGel.fakeVarsLet`,
 *                          const: `window["${testProxyNamespace}"]["${ourNamespace}"]aeroGel.fakeVarsConst`
 *                      }
 *                  }
 *              }
 *          }
 *      }
 *  });
 *
 *  const aeroSandbox = new AeroSandbox({
 *      config: {
 *          proxyNamespace: testProxyNamespace,
 * 			escapeProxyNamespace: true,
 *          ourNamespace,
 *          configKey: "config",
 *          bundles: {
 *              main: "./sandbox.js"
 *          },
 *          rewriters: {
 *              jsLib: self.JSRewriter,
 *          }
 *      }
 *  });
 *
 *  // Example of how you would use it
 *  yourScript = jsRewriter.wrapScript(yourScript, {
 *      isModule,
 *      insertCode: /* js *\/ `
 *          {
 *              const bak = decodeURIComponent(escape(atob(\`${escapeJS(script)}\`)));
 *              ${integral(isMod)}
 *          }
 *      `
 *  });
 */
export default class JSRewriter {
	config: AeroJSParserConfig;
	constructor(config: AeroJSParserConfig) {
		this.config = config;
	}
	applyNewConfig(config: AeroJSParserConfig) {
		this.config = config;
	}
	rewriteScript(script: string, rewriteOptions: RewriteOptions): string {
		if (rewriteOptions.isModule) {
			if (this.config.modeModule === "aerojet") {
				return this.astRewrite(script, rewriteOptions.isModule);
			}
			if (this.config.modeModule === "aerogel") {
				return this.aerogelRewrite(script, rewriteOptions.isModule);
			}
		} else {
			if (this.config.modeDefault === "aerojet") {
				return this.astRewrite(script, rewriteOptions.isModule);
			}
			if (this.config.modeDefault === "aerogel") {
				return this.aerogelRewrite(script, rewriteOptions.isModule);
			}
		}
		return script;
	}
	/** Calls the AeroJet with the config that you provided in the constructor earlier */
	astRewrite(script: string, isModule: boolean): string {
		// Convert AeroJSParserConfig to RewriterConfig
		const rewriterConfig: RewriterConfig = {
			isModule,
			globalsConfig: this.config.globalsConfig || {
				propTrees: {
					fakeLet: "",
					fakeConst: "",
				},
				proxified: {
					evalFunc: "",
					location: "",
				},
				checkFunc: "",
			},
			keywordGenConfig: this.config.keywordGenConfig || {
				supportStrings: true,
				supportTemplateLiterals: true,
				supportRegex: true,
			},
			trackers: this.config.trackers || {
				blockDepth: true,
				propertyChain: true,
				proxyApply: true,
			},
		};

		const astRewriter = new ASTRewriter(rewriterConfig);
		// For now, return the script unchanged since rewriteScript doesn't exist
		return script;
	}
	/**
	 * Calls AeroGel with the config that you provided in the constructor earlier
	 */
	aerogelRewrite(script: string, isModule: boolean): string {
		// Convert AeroJSParserConfig to RewriterConfig
		const rewriterConfig: RewriterConfig = {
			isModule,
			globalsConfig: this.config.globalsConfig || {
				propTrees: {
					fakeLet: "",
					fakeConst: "",
				},
				proxified: {
					evalFunc: "",
					location: "",
				},
				checkFunc: "",
			},
			keywordGenConfig: this.config.keywordGenConfig || {
				supportStrings: true,
				supportTemplateLiterals: true,
				supportRegex: true,
			},
			trackers: this.config.trackers || {
				blockDepth: true,
				propertyChain: true,
				proxyApply: true,
			},
		};

		const aerogelRewriter = new AeroGel(rewriterConfig);
		const result = aerogelRewriter.jailScript(script, isModule);
		if (result.isErr()) {
			throw result.error;
		}
		return result.value;
	}
	/** This is the method you want to use in your proxy */
	wrapScript(script: string, rewriteOptions: RewriteOptions): string {
		const lines = this.rewriteScript(script, rewriteOptions).split("\n");

		const [first] = lines;

		const _meta = rewriteOptions.isModule
			? `${this.config.proxyNamespace}.moduleScripts.resolve`
			: "";

		lines[0] = rewriteOptions.insertCode + _meta + first;

		return lines.join("\n");
	}
}
