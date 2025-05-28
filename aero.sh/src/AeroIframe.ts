/// <reference types="dreamland" />

/**
 * @fileoverview Custom HTMLIFrameElement that automatically rewrites iframe src URLs to go through the Aero proxy
 * 
 * This module defines a custom element that extends the standard HTMLIFrameElement to automatically intercept and rewrite src attributes/properties to route through the Aero proxy system. When a URL is set as the iframe's src, it gets transformed into `/go/${encodeURIComponent(originalUrl)}` format to ensure all iframe content is properly proxied.
 * 
 * @example
 * // HTML usage:
 * <iframe is="aero-iframe" src="https://example.com"></iframe>
 * 
 * @example
 * const iframe = document.createElement("iframe", { is: "aero-iframe" });
 * // Automatically becomes "/go/https%3A//google.com"
 * iframe.src = "https://google.com";
 */

/** A Custom iframe element that automatically proxies all src URLs through aero */
class AeroIframe extends HTMLIFrameElement {
	constructor() {
		super();
		console.log("[AeroIframe] Constructor called - element created!");
	}

	/**
	 * This lifecycle method handles the initial src attribute processing when the element is first added to the DOM. If a src attribute exists, it will be processed and converted to the proxied format
	 * 
	 * @example
	 * // When this HTML is parsed:
	 * // <iframe is="aero-iframe" src="https://example.com"></iframe>
	 * // connectedCallback will automatically convert the src to "/go/https%3A//example.com"
	 */
	connectedCallback(): void {
		console.log("[AeroIframe] Connected callback - element added to DOM");
		const originalSrc = this.getAttribute("src");
		if (originalSrc) {
			console.log(`[AeroIframe] Processing src: ${originalSrc}`);
			const proxiedSrc = this.buildAeroSrc(originalSrc);
			console.log(`[AeroIframe] Setting proxied src: ${proxiedSrc}`);
			super.src = proxiedSrc;
		}
	}


	static get observedAttributes(): string[] {
		return ["src"];
	}


	attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
		if (name === "src" && newValue && this.isConnected) {
			const proxiedSrc = this.buildAeroSrc(newValue);
			console.debug(`[AeroIframe] Updating src to: ${proxiedSrc}`);
			super.src = proxiedSrc;
		}
	}

	/**
	 * Builds the Aero proxy URL from an original URL.
	 * 
	 * This method transforms a regular URL into the format expected by aero.
	 * URLs are converted to the `${aeroConfig.prefix}${rewriteUrl(absoluteUrl)}` format, with special handling for certain URL types that should not be proxied.
	 * 
	 * @private
	 * @param {string} originalUrl - The original URL to be proxied
	 * @returns {string} The proxied URL in Aero format, or the original URL if it should not be proxied
	 */
	private buildAeroSrc(originalUrl: string): string {
		if (!originalUrl || originalUrl === "about:blank" || originalUrl.startsWith("blob:") || originalUrl.startsWith("javascript:")) {
			return originalUrl;
		}
		if (!("aeroConfig" in self)) {
			console.error("[AeroIframe] No aero config provided in the proxy site, unable to continue to build proxied URL (defaulting to about:blank)");
			return "about:blank";
		}
		// @ts-ignore
		if (!("prefix" in self.aeroConfig)) {
			console.error("[AeroIframe] No prefix found in the aero config, unable to continue to build proxied URL (defaulting to about:blank)");
			return "about:blank";
		}
		if (!("urlEncoder" in self.aeroConfig)) {
			console.error("[AeroIframe] No encoder function found in the aero config, unable to continue to build proxied URL (defaulting to about:blank)");
			return "about:blank";
		}
		if (!("urlDecoder" in self.aeroConfig)) {
			console.error("[AeroIframe] No decoder function found in the aero config, unable to continue to build proxied URL (defaulting to about:blank)");
			return "about:blank";
		}
		if (typeof self.aeroConfig.urlEncoder !== "function") {
			console.error("[AeroIframe] The decoder function in the aero config is not a function, unable to continue to build proxied URL (defaulting to about:blank)");
			return "about:blank";
		}
		if (typeof self.aeroConfig.urlDecoder !== "function") {
			console.error("[AeroIframe] The encoder function in the aero config is not a function, unable to continue to build proxied URL (defaulting to about:blank)");
			return "about:blank";
		}
		try {
			const absoluteUrl = new URL(originalUrl, window.location.origin).href;
			return `${self.aeroConfig.prefix}${self.aeroConfig.urlEncoder(absoluteUrl)}`;
		} catch (err) {
			console.warn(`[AeroIframe] Invalid URL to rewrite: ${originalUrl}`, err);
			return `${self.aeroConfig.prefix}${self.aeroConfig.urlDecoder(originalUrl)}`;
		}
	}
}

customElements.define("aero-iframe", AeroIframe, { extends: "iframe" });

export default AeroIframe;