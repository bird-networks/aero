// @ts-nocheck
/**
 * @module
 * TODO: Write a description: ...
 */

import Logger from "../Logger";

import type {
	APIInterceptor,
	proxifiedObjGeneratorCtxType,
	proxifiedObjType,
} from "../../types/apiInterceptors";

import type { default as ToBeDefined, toBeDefinedErrsType } from "../../types/global";

import createApiInterceptorIteratorClient from "./createApiInterceptorIterator";

import isAPIIncluded from "../isApiIncluded";

const logger = new Logger(DEBUG);

type level = number;
type toBeDefinedError = Error;

export default (
	requiredObjs: {
		// TODO: Define types
		proxyNamespaceObj: any;
		aeroSandboxNamespaceObj: any;
		featureConfig: any;
	},
	logger?,
	includeRegExp = /\.ts$/
): {
	toBeDefinedErrs: toBeDefinedErrsType[];
	toBeDefined: ToBeDefined;
} => {
	// Unpack
	// We are assuming the user imports the logger bundle before AeroSandbox
	const { proxyNamespaceObj, aeroSandboxNamespaceObj, featureConfig } = requiredObjs;
	if (!logger) {
		logger = proxyNamespaceObj.logger;
	}

	const proxifiedObjGenCtx: proxifiedObjGeneratorCtxType = {
		...featureConfig.specialInterceptionFeatures,
	};

	const insertLater = new Map<level, proxifiedObjType>();

	const toBeDefinedErrs: toBeDefinedError[] = [];
	const toBeDefined: ToBeDefined = {
		self: {},
		proxifiedObjWorkerVersion: {},
		browsingContext: {},
	};

	for (const aI of createApiInterceptorIteratorClient(includeRegExp)) {
		try {
			const apiInterceptorName = aI.globalProp;
			if (isAPIIncluded(apiInterceptorName, featureConfig)) continue; // Should skip?
			if (DEBUG) {
				logger.debug(
					`Processing API interceptors from the file ${__filename} (${apiInterceptorName})`
				);
			}
			if ("insertLevel" in aI && aI.insertLevel !== undefined && aI.insertLevel !== 0) {
				insertLater.set(aI.insertLevel, aI);
			} else {
				const toBeDefinedErr = handleAI(aI, toBeDefined, proxifiedObjGenCtx);
				if (toBeDefinedErr !== "successful") {
					toBeDefinedErrs.push(toBeDefinedErr);
				}
			}
		} catch (err) {
			toBeDefinedErrs.push(err as toBeDefinedError);
		}
	}

	const sortedInsertObj = Object.entries(
		Array.from(insertLater.keys()).sort((a, b) => b[1] - a[1])
	) as {
		[key: string]: APIInterceptor;
	};

	for (const aI of Object.values(sortedInsertObj)) {
		const err = handleAI(aI, toBeDefined, proxifiedObjGenCtx);
		if (err !== "successful") {
			toBeDefinedErrs.push(err);
		}
	}

	return {
		toBeDefinedErrs,
		toBeDefined,
	};
};

function handleAI(
	aI: APIInterceptor,
	toBeDefined: ToBeDefined,
	proxifiedObjGenCtx: proxifiedObjGeneratorCtxType
): toBeDefinedError | "successful" {
	if (aI.proxifyGetter) {
		const newGetter = aI.proxifyGetter({
			this: toBeDefined.browsingContext[aI.globalProp],
		});
		Object.defineProperty(toBeDefined.browsingContext, aI.globalProp, {
			get: newGetter,
		});
		return "successful";
	}
	if (aI.proxifySetter) {
		Object.defineProperty(toBeDefined.browsingContext, aI.globalProp, {
			set(newVal) {
				const newSetter = aI.proxifySetter({
					this: toBeDefined.browsingContext[aI.globalProp],
					newVal,
				});
				newSetter();
			},
		});
		return "successful";
	}
	if (aI.proxyHandlers) {
		toBeDefined.browsingContext[aI.globalProp] = Proxy.revocable(
			toBeDefined.browsingContext[aI.globalProp],
			aI.proxyHandlers
		);
		return "successful";
	}
	if (aI.proxyHandlersWorkersVersion) {
		toBeDefined.browsingContext[aI.globalProp] = Proxy.revocable(
			toBeDefined.browsingContext[aI.globalProp],
			aI.proxyHandlersWorkersVersion
		);
		return "successful";
	}
	return "successful"; // Default case
}

function resolveProxifiedObj(
	proxifiedObj: proxifiedObjType,
	ctx: proxifiedObjGeneratorCtxType
): proxifiedObjType {
	let proxyObject = {};
	if (typeof proxifiedObj === "function") proxyObject = proxifiedObj(ctx);
	else if (typeof proxifiedObj === "object") proxyObject = proxifiedObj;
	return proxyObject;
}
