/**
 * Shared utilities for opening URLs in the aero iframe
 */

import { showErrorModal } from "./errorModal.js";

/** Check if the Aero service worker is registered and active */
export const checkAeroServiceWorker = async (): Promise<boolean> => {
	try {
		if (!("serviceWorker" in navigator)) {
			return false;
		}

		const registrations = await navigator.serviceWorker.getRegistrations();
		for (const registration of registrations) {
			if (
				registration.active &&
				// @ts-ignore
				registration.scope.includes(self.aeroConfig.prefix)
			) {
				return true;
			}
		}

		return false;
	} catch (error) {
		console.error("[IframeUtils] Error checking service worker:", error);
		return false;
	}
};

/** Global state for iframe functionality */
let isShowingIframe = false;
let currentIframeContainer: HTMLElement | null = null;

/** Show service worker error dialog */
const showServiceWorkerError = () => {
	showErrorModal({
		title: "Unable to proceed",
		message:
			"The aero service worker failed to register! Please refresh the page and try again, if this still doesn't work, please report this in the Discord server.",
	});
};

/** Close the iframe and clean up */
export const closeIframe = () => {
	if (currentIframeContainer) {
		document.body.removeChild(currentIframeContainer);
		currentIframeContainer = null;
	}
	isShowingIframe = false;
	document.body.classList.remove("iframe-active");
};

/** Open a URL in the aero iframe */
export const openInAeroIframe = async (url: string): Promise<boolean> => {
	console.debug("[IframeUtils] Opening URL in aero iframe:", url);

	// Check if service worker is available
	const isSwAvailable = await checkAeroServiceWorker();
	if (!isSwAvailable) {
		console.error("[IframeUtils] Service worker not available");
		showServiceWorkerError();
		return false;
	}

	// Wait for aero-iframe custom element to be defined
	try {
		await customElements.whenDefined("aero-iframe");
	} catch (error) {
		console.error(
			"[IframeUtils] Error waiting for aero-iframe definition:",
			error,
		);
		return false;
	}

	// Close existing iframe if it exists
	if (isShowingIframe) {
		closeIframe();
	}

	// Create iframe container
	const container = document.createElement("div");
	container.className = "iframe-container";
	container.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: var(--md-sys-color-surface, #fff);
		z-index: 2000;
		display: flex;
		flex-direction: column;
	`;

	// Create controls
	const controls = document.createElement("div");
	controls.className = "iframe-controls";
	controls.style.cssText = `
		display: flex;
		justify-content: flex-end;
		padding: 8px;
		background-color: var(--md-sys-color-surface-container-low, #eee);
	`;

	const closeButton = document.createElement("md-icon-button");
	closeButton.setAttribute("aria-label", "Close view");
	closeButton.style.cssText = `
		--md-icon-button-icon-color: var(--md-sys-color-on-surface-variant);
	`;
	closeButton.innerHTML = "<md-icon>close</md-icon>";
	closeButton.addEventListener("click", closeIframe);

	controls.appendChild(closeButton);

	// Create iframe content container
	const iframeContentContainer = document.createElement("div");
	iframeContentContainer.className = "iframe-content-container";
	iframeContentContainer.style.cssText = `
		flex-grow: 1;
		display: flex;
		width: 100%;
		height: 100%;
	`;

	// Create the aero iframe
	const iframe = document.createElement("iframe", {
		is: "aero-iframe",
	}) as HTMLIFrameElement;
	iframe.className = "iframe-element";
	iframe.src = url;
	iframe.style.cssText = `
		flex-grow: 1;
		border: none;
		width: 100%;
		height: 100%;
		display: block;
	`;

	// Assemble the elements
	iframeContentContainer.appendChild(iframe);
	container.appendChild(controls);
	container.appendChild(iframeContentContainer);

	// Add to page
	document.body.appendChild(container);
	document.body.classList.add("iframe-active");

	// Update global state
	isShowingIframe = true;
	currentIframeContainer = container;

	console.debug("[IframeUtils] Successfully created iframe with src:", url);
	return true;
};

// Add global styles for iframe functionality
const iframeStyles = document.createElement("style");
iframeStyles.textContent = `
	body.iframe-active > *:not(.iframe-container) {
		display: none !important;
	}
`;
document.head.appendChild(iframeStyles);

// Handle Escape key to close iframe
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && isShowingIframe) {
		closeIframe();
	}
});
