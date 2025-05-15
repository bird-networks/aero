// @ts-nocheck
// TODO: This will be the runtime version of AeroSandbox

import type { toBeDefinedErrsType } from "$types/global";
import { err as nErr, ok as nOk, ResultAsync } from "neverthrow";
import { assert as typiaAssert } from "typia";

import Logger from "../Logger";

import getPropFromTree from "../../src/shared/getPropFromTree";

import type { Config } from "$types/config";

import initApis from "./initApis";
import isApiIncluded from "../isApiIncluded";

import type { BuildConfig } from "$types/buildConfig";

declare const DEBUG: string;

const logger = new Logger(DEBUG);

const OUR_NAMESPACE = "$aero";
const toBeDefined = "toBeDefined";

export default (buildConfig: BuildConfig) =>
	class AeroSandboxRuntime {
		// TODO: Import the types for these from aero
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		proxyNamespaceObj: any;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		aeroSandboxNamespaceObj: any;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		configObj: any;
		mergedFeatureConfig: any;
		// TODO: Remove AeroSandboxBuildConfig
		// TODO: validate the config with 
		constructor(config: Config) {
			typiaAssert<Config>(config);

			/** This would be `$aero` */
			this.proxyNamespaceObj = getPropFromTree(
				buildConfig.proxyNamespaceObj
			);
			this.proxyNamespaceObj[OUR_NAMESPACE] = { config };
			/** This would be `$aero.sandbox` */
			this.aeroSandboxNamespaceObj =
				this.proxyNamespaceObj[buildConfig.aeroSandboxNamespaceObj];
			this.aeroSandboxNamespaceObj[toBeDefined] = {};
			this.configObj = this.aeroSandboxNamespaceObj[buildConfig.configKey];
			// normalize runtime featuresConfig: 'all' gives no overrides, 'none' gives no features
			const rawRuntimeFC = this.configObj.featuresConfig;
			let runtimeFC: any;
			if (rawRuntimeFC === "all" || rawRuntimeFC == null) {
				runtimeFC = {};
			} else if (rawRuntimeFC === "none") {
				// no APIs enabled at runtime
				runtimeFC = { apiIncludeBitwiseEnum: {} };
			} else {
				runtimeFC = rawRuntimeFC;
			}
			this.mergedFeatureConfig = {
				...buildConfig.featuresConfig,
				...runtimeFC
			};
		}
		// @ts-ignore
		initAPIs(): ResultAsync<void, toBeDefinedErrsType[]> {
			logger.log("Initializing APIs...");

			const { toBeDefinedErrs, toBeDefined } = initApis({
				proxyNamespaceObj: this.proxyNamespaceObj,
				aeroSandboxNamespaceObj: this.aeroSandboxNamespaceObj,
				featureConfig: this.mergedFeatureConfig
			});

			logger.log(toBeDefined);

			for (const [globalProp, proxyObject] of Object.entries(
				toBeDefined.self
			)) {
				// Don't support API Interceptors if the browser doesn't support the API
				if (isApiIncluded(globalProp, this.mergedFeatureConfig))
					self[globalProp] = proxyObject;
			}
			for (const [
				globalProp,
				proxifiedObjWorkerVersion
			] of Object.entries(toBeDefined.proxifiedObjWorkerVersion)) {
				if (isApiIncluded(globalProp, this.mergedFeatureConfig)) {
					Object.defineProperty(
						self,
						globalProp,
						proxifiedObjWorkerVersion as PropertyDescriptor
					);
				}
			}

			return ResultAsync.fromPromise(
				Promise.resolve(),
				() => toBeDefinedErrs
			);
		}
		fakeOrigin(
			proxyOrigin?: string
			// TODO: isWorker = false,
			// TODO: Import from Neverthrow
		): void {
			if (proxyOrigin) this.configObj.proxyOrigin = proxyOrigin; // TODO: Make functionality for this config option
			// When this is unset it will proceed with using the prefix to get the URL for the fake origin
		}
		/** This API isn't implemented yet and is here to serve as a placeholder */
		faker: {};
		// TODO: Import the Rewriters from aero
		rewriters;
	};
