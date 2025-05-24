import type { APIInterceptor } from "$types/apiInterceptors";
import { ExposedContextsEnum, URL_IS_ESCAPE, SupportEnum } from "$types/enums/apiInterceptors";

import rewriteSrc from "$interceptorUtil/src";
import { proxyLocation } from "$shared/proxyLocation";
import proto from "$interceptorUtil/proto";
/**
 * The handler for the methods for registering (`navigator.registerProtocolHandler`) and unregistering (`unregisterProtocolHandler`) the protocols where the URL is for the protocol handler
 */
const sharedProtoHandler = {
	apply(target, that, args) {
		const [scheme, url] = args;
		args[0] = proto.set(scheme);
		args[1] = rewriteSrc(url, proxyLocation().href, $aero.logger);
		return Reflect.apply(target, that, args);
	},
} as ProxyHandler<any>;

/**
 * The escape fixes for the methods for registering (`navigator.registerProtocolHandler`) and unregistering (`unregisterProtocolHandler`) the protocols where the URL is for the protocol handler
 */
const sharedEscapeFixes = [
	{
		targeting: "param",
		targetingParam: 2,
		type: {
			what: "URL_STRING",
			type: URL_IS_ESCAPE.FULL_URL,
		},
	},
];

// @ts-ignore: bypass strict APIInterceptor type compatibility
export default [
	{
		proxyHandler: {
			apply(target, that, args) {
				const [url] = args;
				args[0] = rewriteSrc(url, proxyLocation().href, $aero.logger);
				return Reflect.apply(target, that, args);
			},
		} as ProxyHandler<Navigator["sendBeacon"]>,
		escapeFixes: [
			{
				targeting: "param",
				targetingParam: 1,
				type: {
					what: "URL_STRING",
					type: URL_IS_ESCAPE.FULL_URL,
				},
			},
		],
		globalProp: "navigator.prototype.sendBeacon",
		exposedContexts: ExposedContextsEnum.window,
		supports: SupportEnum.widelyAvailable,
		for: "ORIGIN_ISOLATION"
	},
	{
		proxyHandler: sharedProtoHandler,
		escapeFixes: sharedEscapeFixes,
		globalProp: "navigator.prototype.registerProtocolHandler",
		exposedContexts: ExposedContextsEnum.window,
		supports: SupportEnum.widelyAvailable,
		for: "ORIGIN_ISOLATION"
	},
	{
		proxyHandler: sharedProtoHandler,
		escapeFixes: sharedEscapeFixes,
		globalProp: "navigator.prototype.unregisterProtocolHandler",
		exposedContexts: ExposedContextsEnum.window,
		supports: SupportEnum.widelyAvailable,
		for: "ORIGIN_ISOLATION"
	}
] as APIInterceptor[];
