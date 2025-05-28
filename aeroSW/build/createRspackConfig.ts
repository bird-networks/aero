/**
 * @module
 */

import process from "node:process";

import path from "node:path";

import rspack from "@rspack/core";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";

//import type { FeatureFlagsRspackOptional } from "types/featureFlags";
import createDefaultFeatureFlags from "./createDefaultFeatureFlags";
import featureFlagsBuilder from "../../AeroSandbox/build/featureFlagsBuilder";

const liveBuildMode = "LIVE_BUILD" in process.env;
/** This var is enabled by default */
const verboseMode = !("VERBOSE" in process.env) ||
	process.env.VERBOSE !== "false";
const debugMode = liveBuildMode || "DEBUG" in process.env;

// Scripts
// TODO: Instead use the one from AeroSandbox import InitDist from "./scripts/InitDist";

import Logger from "../../AeroSandbox/build/Logger";

import importSync from "import-sync";

// Attempt to import InitDist, path might need adjustment
// import InitDist from "./scripts/InitDist";
// TODO: Clarify correct path for InitDist, e.g., from "../AeroSandbox/scripts/InitDist" or similar
import InitDist from "../../AeroSandbox/scripts/InitDist"; // Removed .ts extension

export default function createRspackConfig(
	distName = "sw",
): import("@rspack/core").Configuration {
	// TODO: Type assert with partial
	let featureFlagOverrides = {};
	try {
		featureFlagOverrides = importSync("./createFeatureFlags.ts").default;
	} catch (_err) {
		console.warn(
			"⚠️ Unable to find any feature flag overrides. Is this intentional?",
		);
	}

	const featureFlags = createDefaultFeatureFlags({
		...featureFlagOverrides,
		debugMode,
	});

	// For now, let serverMode be potentially a string to satisfy type checks in comparisons,
	// but acknowledge the original logic (serverMode = true) makes those string checks dead code.
	const serverMode: string | boolean = process.env.AERO_SERVER_MODE || true;

	if (serverMode === true || typeof serverMode === "string") { // Ensure this block runs if serverMode is true or a string
		// @ts-ignore
		featureFlags.reqInterceptionCatchAll = JSON.stringify("referrer");
		if (serverMode === "winterjs") {
			// @ts-ignore
			featureFlags.serverOnly = JSON.stringify("winterjs");
		} else if (serverMode === "cf-workers") { // Note: JSON.stringify("cf-workers") was likely an error before
			// @ts-ignore
			featureFlags.serverOnly = JSON.stringify("cf-workers");
		}
		// @ts-ignore
	} else { // This case implies serverMode is boolean false
		// @ts-ignore
		featureFlags.reqInterceptionCatchAll = JSON.stringify("clients");
		// @ts-ignore
		featureFlags.serverOnly = JSON.stringify(false);
	}

	const logger = new Logger(verboseMode);

	logger.log("The chosen feature flags are:"); // Changed from debug to log
	logger.log(featureFlags); // Changed from debug to log

	// biome-ignore lint/suspicious/noExplicitAny: I don't know the exact type to use for this at the moment
	const plugins: any = [
		// @ts-ignore
		new rspack.DefinePlugin(featureFlagsBuilder(featureFlags)),
	];

	if (debugMode) {
		const port = 3300;
		plugins.push(
			// Rsdoctor plugin for bundle analysis and optimization insights
			new RsdoctorRspackPlugin({
				port,
				// Only disable client server in live build mode to avoid port conflicts
				disableClientServer: liveBuildMode,
				linter: {
					rules: {
						// Don't warn about using non ES5 features
						"ecma-version-check": "off",
					},
				},
				supports: {
					generateTileGraph: true,
				},
			}),
		);

		logger.log(`🔬 Rsdoctor will be available at http://localhost:${port} for bundle analysis`);
	}

	const properDirType = debugMode ? "debug" : "prod";
	const properDir = path.resolve(__dirname, "..", "dist", properDirType, distName);

	plugins.push(
		new rspack.CopyRspackPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, "..", "src", "defaultConfig.js"),
					to: path.resolve(properDir, "defaultConfig.js"),
				},
			],
		}),
	);

	logger.log(`Building in ${properDirType} mode`); // Changed from debug to log
	if (liveBuildMode) logger.log("Building in live build mode"); // Changed from debug to log

	const config: import("@rspack/core").Configuration = { // Explicitly type config
		mode: debugMode ? "development" : "production",
		devtool: debugMode ? "eval-source-map" : "source-map",
		entry: {
			sw: path.resolve(__dirname, "..", "src", "handle.ts"),
			// Building these bundles separately allows for the user to roll out their own config files without having to build aero as a whole
		},
		plugins,
		externals: {
			"ts-node": "globalThis",
			"typescript": "globalThis",
			"@minify-html/node": "globalThis",
			"@minify-html/node-darwin-arm64": "globalThis",
		},
		resolve: {
			extensions: [".ts", ".js"],
			alias: {
				"$aero": path.resolve(__dirname, "..", ".."),
				"$jsrewriter": path.resolve(__dirname, "..", "..", "JSRewriter"),
				"$proxyparse": path.resolve(__dirname, "..", "..", "ProxyParse", "src"),
				"$sandbox": path.resolve(__dirname, "..", "..", "AeroSandbox", "src"),
				"$internal": path.resolve(__dirname, "..", "..", "AeroSandbox", "internal"),
				"$util": path.resolve(__dirname, "..", "..", "AeroSandbox", "src", "interceptors", "util"),
				"$interceptorUtil": path.resolve(__dirname, "..", "..", "AeroSandbox", "src", "interceptors", "util"),
				"$swUtil": path.resolve(__dirname, "..", "src", "fetchHandlers", "util"),
				"$shared": path.resolve(__dirname, "..", "..", "AeroSandbox", "src", "shared"),
				"$fetchHandlers": path.resolve(__dirname, "..", "src", "fetchHandlers"),
				"$fetchHandlers/subsystems": path.resolve(__dirname, "..", "src", "fetchHandlers", "subsystems"),
				"$fetchHandlers/isolation": path.resolve(__dirname, "..", "src", "fetchHandlers", "isolation"),
				"$isolation": path.resolve(__dirname, "..", "..", "AeroSandbox", "src", "isolation"),
				"$src": path.resolve(__dirname, "..", "src"),
				"$sw": path.resolve(__dirname, "..", "src"),
				"$alt_backends": path.resolve(__dirname, "..", "src", "altBackends"),
				"$rewriters": path.resolve(__dirname, "..", "src", "fetchHandlers", "rewriters"),
				"$nested_sws": path.resolve(__dirname, "..", "src", "nestedSWs"),
				"$embeds": path.resolve(__dirname, "..", "src", "preprocessors"),
				"$handlers": path.resolve(__dirname, "..", "src", "handlers"),
				"$types": path.resolve(__dirname, "..", "types"),
				"$preprocessors": path.resolve(__dirname, "..", "src", "preprocessors"),
			},
			fallback: {
				"fs": false,
				"path": false,
				"url": false,
				"util": false,
				"module": false,
				"crypto": false,
				"os": false,
				"vm": false,
				"assert": false,
				"console": false,
				"repl": false,
				"esm": false,
				"tsconfig-paths": false,
			},
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: [/[\\/]node_modules[\\/]/],
					loader: "builtin:swc-loader",
				},
			],
		},
		output: {
			filename: "[name].js",
			path: properDir,
			iife: true,
			libraryTarget: "es2022",
		},
		target: ["webworker", "es2022"],
	};
	if (debugMode) config.watch = true;

	new InitDist(
		{
			dist: path.resolve(__dirname, "..", "dist"),
			proper: properDir,
		},
		properDirType,
		verboseMode,
	);

	return config;
}
