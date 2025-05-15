import type { AeroSandboxFeaturesConfig } from "$types/aeroSandbox";

/**
 * Checks if an API should be included based on the feature configuration
 * @param apiName The name of the API to check
 * @param featureConfig The feature configuration to check against
 * @returns Whether the API should be included
 */
export default function isApiIncluded(
	apiName: string,
	featureConfig: AeroSandboxFeaturesConfig
): boolean {
	// If no feature config is provided, include all APIs
	if (!featureConfig) return true;

	// Check if the API is explicitly excluded
	if (featureConfig.apiExcludeBitwiseEnum) {
		if (featureConfig.apiExcludeBitwiseEnum === "none") {
			// No APIs are excluded
		} else if (featureConfig.apiExcludeBitwiseEnum === "fake_vars_and_global_only") {
			// Only fake vars and globals are excluded
			if (apiName.startsWith("fake_") || apiName === "global") return false;
		} else {
			// Check if the API is in the exclude list
			const excludedApis = featureConfig.apiExcludeBitwiseEnum as Record<string, unknown>;
			if (excludedApis[apiName]) return false;
		}
	}

	// Check if the API is explicitly included
	if (featureConfig.apiIncludeBitwiseEnum) {
		if (featureConfig.apiIncludeBitwiseEnum === "all") {
			// All APIs are included
			return true;
		} else if (featureConfig.apiIncludeBitwiseEnum === "fake_vars_and_global_only") {
			// Only fake vars and globals are included
			return apiName.startsWith("fake_") || apiName === "global";
		} else {
			// Check if the API is in the include list
			const includedApis = featureConfig.apiIncludeBitwiseEnum as Record<string, unknown>;
			return !!includedApis[apiName];
		}
	}

	// If no include/exclude rules are specified, include the API
	return true;
}
