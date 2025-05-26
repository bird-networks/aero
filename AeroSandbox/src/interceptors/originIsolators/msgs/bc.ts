import type { APIInterceptor } from "$types/apiInterceptors";
import { ExposedContextsEnum, SupportEnum } from "$types/enums/apiInterceptors";

/**
 * The API Interceptor for escaping the messages done internally by aero through the BroadcastChannel API (escape)
 */
export default {
	proxyHandler: {
		construct(target, args) {
			const [chanName] = args;
			const proxifiedChanName = chanName.startsWith("$aero-")
				? `$aero-${chanName}`
				: chanName;
			return Reflect.construct(target, [proxifiedChanName, ...args.slice(1)]);
		},
	},
	globalProp: "BroadcastChannel",
	exposedContexts: ExposedContextsEnum.window,
	for: "ORIGIN_ISOLATION",
	supports: SupportEnum.widelyAvailable,
} as APIInterceptor;
