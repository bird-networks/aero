// Ryan Wilson
// Set DEBUG global for build scripts BEFORE other imports if they might use it immediately.
// TypeScript knows about global.DEBUG via types/global.d.ts
(globalThis as any).DEBUG = "DEBUG" in process.env || "LIVE_BUILD" in process.env;

import path from "node:path";

import { initAll } from "./buildTools";

import { spawn } from "node:child_process";

async function main() {
	if ("Deno" in globalThis) {
		console.error("This script is not intended to be run in Deno!");
		process.exit(1);
	}

	// DEBUG is now a true global constant, typed by global.d.ts
	const debugMode = DEBUG;

	const properDirType = debugMode ? "debug" : "prod";
	const properDir = path.resolve(__dirname, "..", "dist", properDirType);

	console.log(`Initializing for ${properDirType} build in ${properDir} (Debug mode: ${debugMode})...`);

	try {
		const result = await initAll(
			{
				dist: path.resolve(__dirname, "..", "dist"),
				proper: properDir
			},
			{
				verboseMode: debugMode,
				properDirType
			}
		);

		result.match(
			() => {
				console.log("Initialization successful, running main build script (npm run buildRaw)...");
				const buildProcess = spawn("npm", ["run", "buildRaw"], { stdio: "inherit", shell: true });
				buildProcess.on("close", (code) => {
					if (code !== 0) {
						console.error(`'npm run buildRaw' exited with code ${code}`);
						process.exit(code || 1);
					}
					console.log("Build process completed");
				});
			},
			(err: Error) => {
				console.error(`Failed to initialize the dist folder:`);
				console.error(err.stack);
				process.exit(1);
			}
		);
	} catch (error) {
		console.error("An unexpected error occurred during the build process:");
		console.error(error.stack);
		process.exit(1);
	}
}

main();
