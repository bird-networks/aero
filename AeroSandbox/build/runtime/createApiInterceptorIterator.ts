/* eslint-disable */
// @ts-nocheck
import type { APIInterceptor } from "$types/apiInterceptors";

// require all interceptor modules so Rspack includes them
// @ts-ignore Rspack require.context
const modules = require.context("../../src/interceptors", true, /\.ts$/);

/**
 * Iterates through statically imported APIInterceptor modules
 * @param includeRegExp Regular expression to filter modules by file path
 * @returns Iterable of APIInterceptor objects
 */
export default (includeRegExp: RegExp): Iterable<APIInterceptor> => {
	return {
		*[Symbol.iterator]() {
			for (const file in modules.keys()) {
				// Skip type and test files (which shouldn't be included anyway)
				if (file.endsWith(".d.ts")) {
					console.warn(`Skipping ${file} because it's a type file`);
					continue;
				}
				if (file.endsWith(".test.ts")) {
					console.warn(`Skipping ${file} because it's a test file`);
					continue;
				}
				// Filter by includeRegExp
				if (!includeRegExp.test(file)) {
					logger.log(`Skipping ${file} because it is not included`);
					continue;
				}

				const mod = modules(file) as {
					default: APIInterceptor | APIInterceptor[];
				};
				const apiExport = mod.default;
				if (Array.isArray(apiExport)) {
					for (const interceptor of apiExport) yield interceptor;
				} else {
					yield apiExport;
				}
			}
		},
	};
};
