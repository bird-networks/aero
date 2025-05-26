import type { APIInterceptor } from "$types/apiInterceptors";
import { SupportEnum } from "$types/enums/apiInterceptors";
import { createEscapePropGetHandler } from "$shared/escaping/escape";

// Attempt to create the escape property handler part
const escapeHandlerResult = createEscapePropGetHandler();
let escapeMethods = {};

if (escapeHandlerResult.isOk()) {
	const escapePropHandlerFactory = escapeHandlerResult.value;
	// Now call the inner factory to get the actual handler methods
	escapeMethods = escapePropHandlerFactory(["isSync"]);
} else {
	$aero.logger.fatalErr(
		`Failed to initialize escape property handler for XHR interceptor: ${escapeHandlerResult.error.message}. ` +
			"Escaping/unescaping for 'isSync' will not work."
	);
}

export default {
	proxyHandler: {
		construct(target, args, newTarget) {
			const xhrInstance = Reflect.construct(target, args, newTarget);
			if (args[2] === true) {
				(xhrInstance as any).isSync = true;
				(xhrInstance as any).syncBc = $aero.sandbox.extLib.syncify($aero.bc);
			}
			return xhrInstance;
		},
		...escapeMethods,
	},
	globalProp: "XMLHttpRequest",
	exposedContexts: "ALL_EXCEPT_SERVICE_WORKER",
	supports: SupportEnum.widelyAvailable,
	for: "AERO_INTERNAL_ESCAPING",
	escapeFixes: [],
} as APIInterceptor;
