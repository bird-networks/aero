import type { APIInterceptor } from "$types/apiInterceptors";
import { SupportEnum } from "$types/enums/apiInterceptors";

import { proxyGetString } from "$interceptorUtil/stringProxy";
import rewriteSrc from "$interceptorUtil/src";
import { proxyLocation } from "$shared/proxyLocation";

export default [
	{
		proxifyGetter(ctx) {
			// ctx.this would be an instance of PresentationRequest
			ctx.this = new Proxy(ctx.this, {
				construct(that, args) {
					/** Could either be a string or an array */
					let [urls] = args;
					if (Array.isArray(urls))
						urls = urls.map(url => rewriteSrc(url, proxyLocation().href, $aero.logger));
					else urls = rewriteSrc(urls, proxyLocation().href, $aero.logger);
					args[0] = urls;
					return Reflect.construct(that, args);
				}
			})
		},
		globalProp: "navigator.presentation.receiver.defaultRequest",
		subAPIs: {
			"start": {
				globalProp: "PresentationRequest.start",
				supports: SupportEnum.draft | SupportEnum.shippingChromium
			}
		},
		supports: SupportEnum.draft | SupportEnum.shippingChromium
	},
	{
		proxyHandler: {
			async apply(target, that, args) {
				return rewriteConn(await Reflect.apply(target, that, args));
			}
		},
		globalProp: "PresentationRequest.prototype.start",
		supports: SupportEnum.draft | SupportEnum.shippingChromium
	},
	{
		proxifyGetter(ctx) {
			return new Promise((resolve, reject) => {
				ctx.this.then(conns => {
					resolve(conns.map(rewriteConn));
				}).catch(reject);
			});
		},
		globalProp: "navigator.presentation.receiver.connectionList",
		supports: SupportEnum.draft | SupportEnum.shippingChromium
	}
] as APIInterceptor[];

function rewriteConn(conn) {
	conn.url = new Proxy(conn.url, proxyGetString("PresentationConnection", ["url"]));
}