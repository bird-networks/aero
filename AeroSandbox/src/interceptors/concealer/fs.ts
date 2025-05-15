import type { APIInterceptor } from "$types/apiInterceptors";
import { URL_IS_ESCAPE } from "$types/enums/apiInterceptors";

import { afterPrefix } from "../util/getProxyURL";

export default {
	proxifiedGetter(ctx) {
		return afterPrefix(ctx.this);
	},
	escapeFixes: {
		what: "URL_STRING",
		type: URL_IS_ESCAPE.FULL_URL
	},
	globalProp: "File.prototype.webkitRelativePath",
	exposedContexts: "ALL"
} as APIInterceptor;