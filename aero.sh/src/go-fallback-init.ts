/**
 * @module go-fallback-init
 * Registers the Aero service worker for /go/ fallback page and then loads the current URL in an iframe
 */

// Import for opening the iframe
import { openInAeroIframe } from "./iframeUtils.js";

// Custom Elements - ensure AeroIframe is registered
import "./AeroIframe.js";

// Material Web Components for dialog and iframe controls
import "@material/web/dialog/dialog.js";
import "@material/web/button/text-button.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/icon/icon.js";

/** Configuration for error modal */
interface ErrorModalConfig {
	/** Dialog title/headline */
	title: string;
	/** Error message content */
	message: string;
	/** Button text (defaults to "OK") */
	buttonText?: string;
}

/**
 * Shows a Material 3 error dialog with the specified configuration
 * For the fallback page, onClose redirects to the main site
 * @param config - Configuration for the error dialog
 */
function showErrorModalFallback(config: ErrorModalConfig): void {
	const { title, message, buttonText = "OK" } = config;

	const dialog = document.createElement("md-dialog");
	dialog.setAttribute("type", "alert");
	dialog.innerHTML = `
		<div slot="headline">${title}</div>
		<div slot="content">
			${message}
		</div>
		<div slot="actions">
			<md-text-button autofocus onclick="this.closest('md-dialog').close()">
				${buttonText}
			</md-text-button>
		</div>
	`;

	document.body.appendChild(dialog);
	dialog.setAttribute("open", "true");

	// Clean up after dialog closes and redirect
	dialog.addEventListener("close", () => {
		document.body.removeChild(dialog);
		// Redirect to main site (the proxy won't work anyway)
		window.location.href = "https://aero.sh/";
	});
}

/**
 * Registers the Aero service worker
 * @returns True if successful, false otherwise
 */
async function registerAeroServiceWorkerFallback(): Promise<boolean> {
	if (!("serviceWorker" in navigator)) {
		console.warn(
			"[FallbackInit] Service Workers not supported in this browser",
		);
		showErrorModalFallback({
			title: "Browser Not Supported",
			message:
				"Service Workers are not supported in your browser. Aero will not work.",
		});
		return false;
	}
	try {
		// Ensure aeroConfig is available
		if (!window.aeroConfig?.pathToInitialSW) {
			console.error("[FallbackInit] aeroConfig or pathToInitialSW not defined");
			showErrorModalFallback({
				title: "Configuration Error",
				message:
					"Aero Service Worker path is not configured. Cannot register the Service Worker.",
			});
			return false;
		}
		const registration = await navigator.serviceWorker.register(
			window.aeroConfig.pathToInitialSW,
			{
				scope: window.aeroConfig.prefix || "/", // Default to root scope if prefix is not defined
			},
		);
		console.debug(
			"[FallbackInit] Aero Service Worker registered with scope",
			registration.scope,
		);
		return true;
	} catch (err) {
		console.error(
			"[FallbackInit] Aero Service Worker registration failed",
			err,
		);
		showErrorModalFallback({
			title: "Service Worker Registration Failed",
			message:
				"The Aero Service Worker failed to register. This is necessary for Aero to function.",
		});
		return false;
	}
}

/** Main initialization function for the fallback page */
async function fallbackMain(): Promise<void> {
	const swRegistered = await registerAeroServiceWorkerFallback();
	if (!swRegistered) {
		console.warn(
			"[FallbackInit] Service Worker registration failed. Aborting iframe open.",
		);
		// Return early if the SW registration fails, as the error modal is already shown
		return;
	}

	// Open the current URL in an iframe
	const currentUrl = window.location.href;
	console.info(
		`[FallbackInit] Service Worker registered. Attempting to open ${currentUrl} in iframe...`,
	);

	// Hide the loading container on the fallback page as the iframe will take over
	const loadingContainer = document.querySelector(".loading-container");
	if (loadingContainer && loadingContainer instanceof HTMLElement) {
		loadingContainer.style.display = "none";
	}

	await openInAeroIframe(currentUrl);
}

fallbackMain();
