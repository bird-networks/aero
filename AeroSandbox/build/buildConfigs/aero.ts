import type { BuildConfig } from "../../types/buildConfig";
// @ts-ignore: allow importing TS file for runtime loader
// biome-ignore lint/style/useImportType: importing TS file for runtime
import { defaultSWProxyFeatures } from "../../types/featureMembers.ts";

export default {
	proxyNamespaceObj: "$aero",
	aeroSandboxNamespaceObj: "sandbox",
	configKey: "config",
	featuresConfig: {
		/** These enum members enable code inside of the Proxy handler that provide other things you may want to use AeroSandbox for */
		specialInterceptionFeatures: defaultSWProxyFeatures,
	},
} as BuildConfig;
