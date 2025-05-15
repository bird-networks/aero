/**
 * @module
 * This module contains iterators for API interceptors in Node.js.
 * One is synchronous and the other is asynchronous.
 */

import type { APIInterceptor } from "../types/apiInterceptors";

import Logger from "./Logger";

import { glob, globSync } from "glob";

import importSync from "import-sync";

import apiInterceptorsPath from "./apiInterceptorsPath";

/**
 * Allows you to iterate over API Interceptors in Node.js
 * @param patterns list of glob patterns for files, where the API Interceptors are, to include
 * @param ignoreList The list of glob patterns for files to ignore
 * @param debugMode Enable verbose logging
 * @returns An async iterable of API Interceptors
 * @example
 * import createApiInterceptorIterator from "...";
 * ...
 * for await (const apiInterceptor of createApiInterceptorIterator()) {
 * 	...
 * }
 */
export default (
	patterns: string | string[] = `${apiInterceptorsPath}/**/*.ts`,
	ignoreList: string[] = [],
	debugMode = false
): AsyncIterable<APIInterceptor> => {
	const logger = new Logger(debugMode);
	return {
		async *[Symbol.asyncIterator]() {
			for (const tsFilePath of await glob(patterns, {
				ignore: ignoreList
			})) {
				logger.log(`Importing API Interceptor from ${tsFilePath}`);
				const mod = await import(tsFilePath);
				const aI = mod.default;
				yield aI;
			}
		}
	} as AsyncIterable<APIInterceptor>;
};

/**
 * Allows you to iterate over API Interceptors in Node.js synchronously
 * @param patterns list of glob patterns for files, where the API Interceptors are, to include
 * @param ignoreList The list of glob patterns for files to ignore
 * @param debugMode Enable verbose logging
 * @returns An iterable of API Interceptors
 * @example
 * import { createApiInterceptorIteratorNodeSync as createApiInterceptorIterator } from "...";
 * ...
 * for (const apiInterceptor of createApiInterceptorIterator()) {
 * 	...
 * }
 */
export function createApiInterceptorIteratorNodeSync(
	patterns: string | string[] = `${apiInterceptorsPath}/**/*.ts`,
	ignoreList: string[] = [],
	debugMode = false
): Iterable<APIInterceptor> {
	const logger = new Logger(debugMode);
	return {
		*[Symbol.iterator]() {
			for (const tsFilePath of globSync(patterns, {
				ignore: ignoreList
			})) {
				logger.log(`Importing API Interceptor from ${tsFilePath}`);
				const mod = importSync(tsFilePath);
				yield mod.default || mod;
			}
		}
	} as Iterable<APIInterceptor>;
}
