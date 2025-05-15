import type { APIInterceptor } from "$types/apiInterceptors";
import isHTML from "$interceptorUtil/isHTML";

export default {
	proxyHandler: {
		apply(target, that, args) {
			const [arr, opts] = args;

			if (isHTML(opts.type))
				args[0] = arr.map((html: string) => $aero.init + html);

			const ret: any = Reflect.apply(target, that, args);

			let size = 0;
			args[0].forEach((html: string) => (size += html.length));
			ret.size = size;

			return ret;
		}
	},
	globalProp: "Blob"
} as APIInterceptor;
