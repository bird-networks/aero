import path from "node:path";

import rspack from "@rspack/core";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

import Logger from "./build/Logger";

import type { createFeatureFlags } from "./build/featureFlags";
import createDefaultFeatureFlags from "./build/createDefaultFeatureFlags";

import featureFlagsBuilder from "./build/featureFlagsBuilder";

import type { Configuration } from "@rspack/core";

export default async function () {
	const liveBuildMode = "LIVE_BUILD" in process.env;
	let debugMode = liveBuildMode || "DEBUG" in process.env;
	/** This var is enabled by default */
	const verboseMode = !("VERBOSE" in process.env) || process.env.VERBOSE !== "false";
	/** Build AeroSandbox without the extra APIs. This should be used when building just for the proxy only; **/
	const minimalBuild = "BUILD_MINIMAL" in process.env;
	const minimalSharedBuild = "BUILD_SHARED_MINIMAL" in process.env;
	/** Makes independent build files for each module that will be tested in the unit testing **/
	const testBuild = "TEST_BUILD" in process.env;
	if (!debugMode && testBuild) debugMode = true;

	// This is the most important env variable
	const buildConfigPath = process.env.BUILD_CONFIG_PATH;
	if (!buildConfigPath) {
		throw new Error(
			"Fatal: BUILD_CONFIG_PATH env variable not set. Don't know what to build for!"
		);
	}

	/**
	 * The user-defined overrides for the default feature flags config.
	 * It is set to Partial because we will set it later when `createFeatureFlags.ts` is imported. */
	let featureFlagOverrides: Partial<createFeatureFlags> = {};
	try {
		// @ts-ignore
		const imported = await import("./createFeatureFlags.ts");
		featureFlagOverrides = imported.default;
	} catch (_err) {
		console.warn("⚠️ Unable to find any feature flag overrides. Is this intentional?");
	}

	/** The feature flags to be used in the build config */
	const featureFlags = createDefaultFeatureFlags({
		...featureFlagOverrides,
		debugMode,
	});

	/** The plugins to be used in the build config */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const plugins: any[] = [
		new rspack.ProgressPlugin(),
		// Show build progress
		new NodePolyfillPlugin(),
		new rspack.DefinePlugin(featureFlagsBuilder(featureFlags) as Record<string, string>),
		new rspack.DefinePlugin({
			BUILD_CONFIG_PATH: JSON.stringify(buildConfigPath),
		}),
	];

	// Inject proxy and config keys from build config
	const bcModule = await import(buildConfigPath);
	const bc = bcModule.default;
	plugins.push(
		new rspack.DefinePlugin({
			PROXY_NAMESPACE: JSON.stringify(bc.proxyNamespaceObj),
			OUR_NAMESPACE: JSON.stringify(bc.aeroSandboxNamespaceObj),
			CONFIG_KEY: JSON.stringify(bc.configKey),
		})
	);

	const logger = new Logger(verboseMode);

	logger.log("The chosen feature flags are:");
	logger.log(featureFlags);

	if (debugMode) {
		plugins.push(
			// There are currently a bug with Rsdoctor where the option `disableClientServer` doesn't work. You must launch the bundle analyzer through the cli instead.
			new RsdoctorRspackPlugin({
				//port: 3301,
				// Do not pop up every time in a live build watcher scenario (annoying)
				disableClientServer: true,
				linter: {
					rules: {
						// Don't warn about using non ES5 features
						"ecma-version-check": "off",
					},
				},
				supports: {
					generateTileGraph: true,
				},
			})
		);
	}

	const properDirType = debugMode ? "debug" : "prod";
	const properDir = path.resolve(__dirname, "dist", properDirType);

	logger.log(`\nBuilding in ${properDirType === "prod" ? "production" : "debug"} mode`);
	if (liveBuildMode) logger.log("Building in live build mode");

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const output: any = {
		filename: "[name].js",
		path: testBuild ? path.resolve(__dirname, "../../tests/aero") : properDir,
		clean: false,
	};

	if (testBuild) output.library = ["Mod", "[name]"];

	const defaultBuild = {
		sandbox: "./build/runtime/init.ts",
		//featureFlags: "./src/featureFlags.ts",
		swAdditions: "./src/swAdditions.ts",
		init$aero: "./src/init$aero.ts",
		end$aero: "./src/end$aero.ts",
	};

	function genEntryFiles(entryFiles) {
		/*
		// FIXME:
		if (minimalSharedBuild) {
			const modulesSharedWithSW = globSync(`${__dirname}/src/shared/*.ts`)
			return [...entryFiles, ...modulesSharedWithSW];
		}
		*/
		return entryFiles;
	}

	const config: Configuration = {
		ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
		infrastructureLogging: { level: "error" },
		externalsPresets: { node: true },
		mode: debugMode ? "development" : "production",
		optimization: {
			chunkIds: "named",
		},
		entry: genEntryFiles(
			testBuild
				? {
					// API Interceptors for the Script Sandbox
					location: "./src/interceptors/loc/location.ts",
					scriptSandbox: "./src/interceptors/concealer/misc/scriptSandboxing.ts",
					// Libs for the API Interceptors
					loggers: "./src/shared/Loggers.ts",
					replaceProxyNamespace: "./build/replaceProxyNamespace.ts",
					jsDiffTestData: "./src/sandboxers/JS/ProxyParse/tests/shared/testData.ts",
				}
				: minimalBuild
					? {
						...defaultBuild,
						// Extra APIs
						storageIsolation: "./src/apis/StorageIsolator/storageIsolation.ts",
						ControlView: "./src/apis/CustomViews/ControlView.ts",
						ElectronControlView: "./src/apis/CustomViews/ElectronControlView.ts",
						ElectronWebView: "./src/apis/CustomViews/ElectronWebView.ts",
					}
					: defaultBuild
		),
		plugins,
		resolve: {
			extensions: [".ts", ".d.ts"],
			tsConfig: path.resolve(__dirname, "./tsconfig.json"),
			alias: {
				$shared: path.resolve(__dirname, "src/shared"),
				$util: path.resolve(__dirname, "src/interceptors/util"),
				$interceptorUtil: path.resolve(__dirname, "src/interceptors/util"),
				$cors: path.resolve(__dirname, "src/security/cors"),
				$src: path.resolve(__dirname, "src"),
				$sandbox: path.resolve(__dirname, "src/sandboxers"),
				$apis: path.resolve(__dirname, "src/apis"),
				$types: path.resolve(__dirname, "types"),
				BUILD_CONFIG_PATH: path.resolve(__dirname, process.env.BUILD_CONFIG_PATH as string),
			},
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: [
						{
							loader: "builtin:swc-loader",
						},
					],
				},
				{
					test: /\.val\.ts$/,
					use: [
						{
							loader: "val-loader",
							options: {
								compiler: "@swc-node/register",
							},
						},
					],
				},
			],
		},
		output,
	};

	if (debugMode) config.watch = true;

	return config;
}
