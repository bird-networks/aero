/**
 * @module baremux-init
 * Initializes BareMux connection, sets the transport, and registers the Aero service worker
 */
import { BareMuxConnection } from "@mercuryworkshop/bare-mux";
import { showErrorModal } from "./errorModal.js";

/**
 * Initializes the BareMux connection and sets the Wisp transport
 * Assumes `BareMux` worker and Epoxy transport files are served correctly by Vite config
 * @returns The `BareMux` connection or `null` if initialization fails
 */
async function initBareMux(): Promise<void> {
	console.debug("[BareMux] Initializing BareMux connection");
	let bareMuxConn;
	try {
		bareMuxConn = new BareMuxConnection("/baremux/worker.js");
	} catch (err) {
		console.error("[BareMux] Failed to initialize BareMux connection", err);
		showErrorModal({
			title: "BareMux Failed to Initialize",
			message: "BareMux failed to initialize properly. Please refresh the page and try again, if this still doesn't work, please report this in the Discord server."
		});
		return;
	}

	try {
		await bareMuxConn.setTransport("/epoxy/index.mjs", [{ wisp: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/` }]);
		console.debug("[BareMux] BareMux transport set to Epoxy (Wisp)");
	} catch (err) {
		console.error("[BareMux] Failed to set BareMux transport:", err);
		console.error("[BareMux] Failed to initialize BareMux connection", err);
		showErrorModal({
			title: "Failed to Initialize BareMux Transport",
			message: "The BareMux transport failed to initialize. Please refresh the page and try again, if this still doesn't work, please report this in the Discord server."
		});
		throw err;
	}
}

/** Registers the Aero service worker */
async function registerAeroServiceWorker(): Promise<void> {
	if ("serviceWorker" in navigator) {
		try {
			const registration = await navigator.serviceWorker.register(
				"/sw.js",
				{
					scope: "/",
				},
			);
			console.debug("aero's SW registered with scope", registration.scope);
		} catch (error) {
			console.error("aero's SW registration failed", error);
			showErrorModal({
				title: "aero Initialization Failed",
				message: "aero's SW registration failed, please refresh the page and try again, if this still doesn't work, please report this in the Discord server."
			});
		}
	} else {
		console.warn("Service Workers not supported in this browser");
		showErrorModal({
			title: "Browser Not Supported",
			message: "Service Workers are not supported in your browser! aero will not work."
		});
	}
}

/** Main initialization function */
async function main(): Promise<void> {
	await registerAeroServiceWorker();
	await initBareMux();
}
main();
