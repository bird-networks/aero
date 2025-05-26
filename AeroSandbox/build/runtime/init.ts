// @ts-nocheck
/**
 * Entry point for AeroSandbox runtime: attach factory to global
 */
declare global {
	interface Window {
		AeroSandbox: typeof createAeroSandboxRuntime;
	}
}

import createAeroSandboxRuntime from "./createAeroSandbox";

// Expose factory in global scope
(self as any).AeroSandbox = createAeroSandboxRuntime;
