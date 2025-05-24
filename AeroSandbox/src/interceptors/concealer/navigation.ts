/**
 * Concealers for the Navigation API entries and transitions
 * This module is not yet complete
 */
import { afterPrefix } from "$interceptorUtil/getProxyURL";
import { proxyLocation } from "$shared/proxyLocation";

import type { APIInterceptor } from "$types/apiInterceptors";
import { ExposedContextsEnum, SupportEnum } from "$types/enums/apiInterceptors";

// @ts-ignore: bypass strict APIInterceptor type compatibility
export default [
	// Entries
	// FIXME
	{
		proxyHandler: {
			apply(target, that, args) {
				const entries: any[] = Reflect.apply(target, that, args);

				// We may delete some entries, so we will update the index with the new index
				let i = 0;

				const newEntries: any[] = [];

				for (const entry of entries) {
					const newEntry = entry;

					// The original property is a getter property, as the value will be changed dynamically
					Object.defineProperty(newEntry, "url", {
						get: () => afterPrefix(entry.url)
					});

					try {
						if (
							new URL(newEntry.url).origin !==
							proxyLocation().origin
						)
							// The site is not supposed to see this entry
							continue;
					} catch {
						continue;
					}

					// Offset the index to delete the entry change without the site noticing
					Object.defineProperty(newEntry, "index", {
						value: i++
					});

					newEntries.push(newEntry);
				}

				return newEntries;
			}
		},
		globalProp: "navigation.entries",
		conceals: [
			{
				what: "NavigationEntry.url",
				revealerType: {
					type: "url",
					reveals: "escapedUrl"
				}
			}
		],
		exposedContexts: ExposedContextsEnum.window,
		for: "ORIGIN_ISOLATION",
		supports: SupportEnum.draft | SupportEnum.shippingChromium
	},
	{
		emuFunc: () => proxyLocation().href,
		globalProp: "navigation.transition.from",
		conceals: [
			{
				what: "itself",
				revealerType: {
					type: "url",
					reveals: "realUrl"
				}
			}
		],
		exposedContexts: ExposedContextsEnum.window,
		for: "ORIGIN_ISOLATION",
		supports: SupportEnum.draft | SupportEnum.shippingChromium
	},
	{
		proxifiedObj: Proxy.revocable(navigation.addEventListener, {
			apply(target, that, args) {
				const [messageType, listener] = args;

				if (messageType === "currententrychange")
					args[1] = (event: NavigationCurrentEntryChangeEvent) => {
						if ("url" in event.from)
							Object.defineProperty(event.from, "url", {
								get: () => afterPrefix(event.from.url),
								configurable: false
							});

						// TODO: i2 is undefined, and this proxy reassignment for event.from.addEventListener needs review
						// event.from.addEventListener = new Proxy(
						// 	event.from.addEventListener,
						// 	// @ts-ignore
						// 	i2.proxifiedObj
						// );

						listener(event);
					};

				return Reflect.apply(target, that, args);
			}
		}),
		globalProp: "navigation.addEventListener",
		conceals: [
			{
				what: "NavigationCurrentEntryChangeEvent.from.url",
				revealerType: {
					type: "url",
					reveals: "escapedUrl"
				}
			}
		],
		exposedContexts: ExposedContextsEnum.window,
		for: "ORIGIN_ISOLATION",
		supports: SupportEnum.draft | SupportEnum.shippingChromium
	}
] as APIInterceptor[];