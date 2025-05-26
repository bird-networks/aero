import type { APIInterceptor } from "$types/apiInterceptors";
import { SupportEnum } from "$types/enums/apiInterceptors";

import { afterPrefix } from "$util/getProxyURL";

export default {
	proxyHandler: {
		apply(_target, _that, args) {
			const [callback] = args;

			// Conceal the target URL from the launch params
			return (launchParams: any) => {
				launchParams.targetUrl = afterPrefix(launchParams.targetUrl);
				callback(launchParams);
			};
		},
	},
	globalProp: "launchQueue.setConsumer",
	//conceals: ["LaunchParams.targetURL"],
	supports: SupportEnum.draft | SupportEnum.shippingChromium,
} as APIInterceptor;
