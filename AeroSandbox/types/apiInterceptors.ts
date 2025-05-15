// Ryan Wilson
// biome-ignore lint/style/useEnumInitializers: preserve initializer comments from .d.ts
export enum InterceptionFeaturesEnum {
	/** This member requires the correct context to be passed down in the proxy's global context */
	corsEmulation,
	/** This member requires the correct context to be passed down in the proxy's global context */
	cacheEmulation,
	/** This feature is nowhere near being finished; **do not enable** */
	privacySandbox,
	/** Using this member adds code to the navigator.serviceWorker API interceptor to support nestedWorkers. If you enable it and don't have the supplementing SW code for it, it gives up on waiting for a message response back and throws an error. **/
	nestedSWs,
	/** This feature is nowhere near being finished; **do not enable** */
	swLess,
	aerogel,
	/** Only use this if you aren't using Custom Element "is" interception */
	elementConcealment,
	errorConcealment,
	messageIsolation,
	/** Only use this member if you aren't using it for a regular SW proxy */
	requestUrlProxifier
}

export enum URL_IS_ESCAPE {
	ORIGIN,
	HOSTNAME,
	DOMAIN,
	PROTOCOL,
	FULL_URL
}

// biome-ignore lint/style/useEnumInitializers: preserve initializer comments from .d.ts
export enum SupportEnum {
	deprecated,
	nonstandard,
	draft,
	shippingChromium,
	originTrialExclusive,
	/** In Firefox, Chromium, and WebKit */
	widelyAvailable
}

export enum ExposedContextsEnum {
	dedicatedWorker,
	sharedWorker,
	audioWorklet,
	animationWorklet,
	layoutWorklet,
	sharedStorageWorklet,
	paintWorklet,
	serviceWorker,
	window
}

export enum AltProtocolEnum {
	wrtc,
	ws,
	wt
}