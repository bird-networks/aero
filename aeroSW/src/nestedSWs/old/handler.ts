type proxyOrigin = true;
self.nestedSWs = new Map<proxyOrigin, NestedSW[]>();

// TODO: Use this polyfill if needed https://github.com/GoogleChromeLabs/dynamic-import-polyfill

// Config types
type NestedSW = {
	options: RegistrationOptions;
	events: any;
};

// TODO: Move this to aero.d.ts
type NestedSWAPIInterceptors = {
	Function?: typeof Function;
	self?: typeof globalThis;
	addEventListener: typeof self.addEventListener;
	removeEventListener: typeof self.removeEventListener;
	postMessage: typeof self.postMessage;
};

function rewriteSource(sourceCode: string) {
	// TODO: Implement
	// TODO: Wrap everything in a try statement and catch and if there is an error send it to the site that generated the nested SW
	return sourceCode;
}

const createNestedSWFetchSandbox = (nestedSWListener: any) => { };
// TODO: Sandbox the Content Index and Cache APIs
const createNestedSWRunnerSandbox = (sourceCode: string, nestedSW: NestedSW) => {
	const proxified: NestedSWAPIInterceptors = {
		addEventListener: new Proxy(self.addEventListener, {
			apply(_target, _that, args) {
				const [type, listener] = args;

				if (type === "fetch") {
					nestedSW.events.fetch = (realSWEvent: any) => {
						listener(realSWEvent);
					};
				}
				// TODO: Support other the other SW events
			},
		}),
		removeEventListener: self.removeEventListener,
		postMessage: self.postMessage,
	};
	proxified.self = new Proxy(self, {
		get(target, prop: string | symbol) {
			if (prop in proxified) return (proxified as any)[prop];
			else return Reflect.get(target, prop);
		},
	});
	proxified.Function = new Proxy(Function, {
		construct(target, argArray, newTarget) {
			// Handle function construction arguments
			if (argArray.length >= 2) {
				const evalCode = argArray[argArray.length - 1]; // Last argument is the function body
				argArray[argArray.length - 1] = rewriteSource(evalCode);
			}

			const createdFunc = Reflect.construct(target, argArray, newTarget);
			return createdFunc;
		},
		get(target, prop) {
			if (prop === "bind" || prop === "call" || prop === "apply") {
				target[prop] = new Proxy(target[prop], {
					apply(target, that, args) {
						let [thisArg, ...bindArgs] = args;

						thisArg = {
							...proxified.self,
							...thisArg,
						};

						return Reflect.apply(target, that, [
							thisArg,
							...bindArgs,
						]);
					},
				});
			}
		},
	});
	return new Function(...Object.keys(proxified), sourceCode)(
		proxified.self,
		proxified.addEventListener,
		proxified.removeEventListener,
		proxified.postMessage,
	);
};

export default () => {
	const nestedSWBC = new BroadcastChannel("nestedSW");

	function continueWithSource(data: any, sourceCode: string) {
		const nestedSWSandbox = createNestedSWRunnerSandbox(sourceCode, {
			options: {},
			events: { fetch: () => { } },
		});

		try {
			nestedSWSandbox(sourceCode);
			nestedSWBC.postMessage({
				type: "registered",
				data: {
					id: data.id,
				},
			});
		} catch (err) {
			nestedSWBC.postMessage({
				type: "registration_failed",
				data: {
					id: data.id,
				},
			});
		}
	}

	nestedSWBC.onmessage = (ev) => {
		if (ev.data.type === "register") {
			if ("swURL" in ev.data) {
				fetch(ev.data.swURL)
					.then(async (resp) => {
						const sourceCode = await resp.text();
						continueWithSource(ev.data, sourceCode);
					})
					.catch((err) => {
						nestedSWBC.postMessage({
							type: "err_fetch_failed",
							data: {
								url: ev.data.swURL,
								id: ev.data.id,
								error: err,
							},
						});
					});
			} else if ("sourceCode" in ev.data) {
				continueWithSource(ev.data, ev.data.sourceCode);
			} else {
				nestedSWBC.postMessage({
					type: "err_invalid_sw_url",
					data: {
						url: ev.data.swURL,
						id: ev.data.id,
					},
				});
			}
		}
	};
};
