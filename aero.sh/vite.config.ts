import { defineConfig } from "vite";
import { dreamlandPlugin } from "vite-plugin-dreamland";
import type { Plugin } from "vite";

import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { watch } from "chokidar";
import { existsSync, readdirSync } from "node:fs";

import { viteStaticCopy } from "vite-plugin-static-copy";

import wisp from "wisp-server-node";
// @ts-ignore: r58 is an idiot
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const debug =
	process.env.DEBUG === "true" || process.env.DEBUG === "1" || false;
const autoUpdate =
	process.env.AUTO_UPDATE === "true" ||
	process.env.AUTO_UPDATE === "1" ||
	false;

/**
 * Parse debounce delay from environment variable with default fallback
 * Accepts values in seconds, converts to milliseconds
 */
const debounceDelay = (() => {
	const envValue = process.env.DEBOUNCE_DELAY;
	if (!envValue) return 30000; // Default: 30 seconds

	const parsed = Number.parseInt(envValue, 10);
	if (Number.isNaN(parsed) || parsed < 0) {
		console.warn(
			`Invalid DEBOUNCE_DELAY value: ${envValue}. Using default 30 seconds.`,
		);
		return 30000;
	}

	// Convert seconds to milliseconds
	return parsed * 1000;
})();

const __dirname = import.meta.dirname;

const aeroSWPath = resolve(__dirname, "../", "aeroSW");
const aeroSandboxPath = resolve(
	__dirname,
	"../",
	"AeroSandbox",
	"dist",
	debug ? "debug" : "prod",
);
const aeroPath = resolve(aeroSWPath, "dist", debug ? "debug" : "prod");

/** Custom plugin for Vite to serve the wisp server */
function viteWispPlugin(): Plugin {
	return {
		name: "vite-wisp-server",
		configureServer(server) {
			server.httpServer?.on("upgrade", (req, socket, head) => {
				console.log("wisp upgrade", req.url);
				if (req.url.startsWith("/wisp")) wisp.routeRequest(req, socket, head);
			});
		},
	};
}

/**
 * Custom plugin to watch source directories and trigger builds automatically
 * Automatically builds missing `dist` files on startup and watches for source changes with debouncing
 * Only active in debug mode
 */
function viteBuildWatchPlugin(): Plugin {
	const buildQueue = new Set<string>();
	let isBuilding = false;
	const buildTimeouts = new Map<string, NodeJS.Timeout>();
	const AUTO_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

	/**
	 * Check if a directory exists and has files
	 * @param dirPath - Path to the directory to check
	 * @returns True if directory exists and contains files, false otherwise
	 */
	function hasFiles(dirPath: string): boolean {
		try {
			if (!existsSync(dirPath)) return false;
			const files = readdirSync(dirPath);
			return files.length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * Execute git pull in the repository root
	 * Automatically updates the repository from the remote
	 */
	async function runGitPull() {
		console.info("🔄 Running automatic git pull...");

		try {
			const gitProcess = spawn("git", ["pull"], {
				cwd: resolve(__dirname, "../"),
				stdio: "inherit",
			});

			await new Promise((resolve, reject) => {
				gitProcess.on("close", (code) => {
					if (code === 0) {
						console.info("✅ Git pull completed successfully");
						resolve(void 0);
					} else {
						console.warn(`⚠️ Git pull completed with code ${code}`);
						resolve(void 0);
					}
				});
			});
		} catch (err) {
			console.warn("Failed to run git pull:", err);
		}
	}

	/**
	 * Execute npm run build for a specific project
	 * Handles build queuing when another build is already running
	 * @param projectPath - Absolute path to the project directory
	 * @param projectName - Human-readable name of the project for logging
	 */
	async function runBuild(projectPath: string, projectName: string) {
		if (isBuilding) {
			buildQueue.add(projectPath);
			console.info(
				`📋 ${projectName} build queued (another build in progress)`,
			);
			return;
		}

		isBuilding = true;
		console.info(`🔨 Building ${projectName}...`);

		console.log(debug);
		try {
			// Create environment variables - AeroSandbox checks if DEBUG key exists, not its value
			let buildEnv = debug
				? { ...process.env, DEBUG: "true" }
				: { ...process.env };
			// Remove DEBUG key for non-debug builds
			if (!debug && "DEBUG" in buildEnv) {
				const { DEBUG, ...envWithoutDebug } = buildEnv;
				buildEnv = envWithoutDebug;
			}

			const buildProcess = spawn("npm", ["run", "build"], {
				cwd: projectPath,
				// Monitor output for completion signals
				stdio: "pipe",
				env: buildEnv,
			});

			// Pipe output to console while monitoring for completion
			let buildOutput = "";
			buildProcess.stdout?.on("data", (data) => {
				const chunk = data.toString();
				buildOutput += chunk;
				process.stdout.write(chunk);
			});
			buildProcess.stderr?.on("data", (data) => {
				process.stderr.write(data);
			});

			await new Promise((resolve, reject) => {
				let completed = false;

				function complete(success: boolean, message: string) {
					if (completed) return;
					completed = true;

					if (success) {
						console.info(`✅ ${projectName} ${message}`);
						resolve(void 0);
					} else {
						console.warn(`❌ ${projectName} ${message}`);
						reject(new Error(message));
					}
				}

				// Monitor output for completion signals
				buildProcess.stdout?.on("data", (data) => {
					const output = data.toString();
					if (
						output.includes("compiled successfully") ||
						output.includes("✓ built in")
					) {
						// Give process a moment to exit naturally, then force completion
						setTimeout(() => {
							if (!completed) {
								console.info(
									`🎯 ${projectName} detected completion, forcing exit`,
								);
								complete(true, "build completed (detected from output)");
							}
						}, 1000);
					}
				});

				buildProcess.on("close", (code) => {
					complete(
						code === 0,
						code === 0
							? "build completed successfully"
							: `build failed with code ${code}`,
					);
				});

				buildProcess.on("error", (err) => {
					complete(false, `build process error: ${err.message}`);
				});

				// Timeout protection
				const timeout = setTimeout(
					() => {
						if (!completed) {
							console.warn(
								`⏰ ${projectName} build timed out after 2 minutes, terminating...`,
							);
							buildProcess.kill("SIGTERM");
							setTimeout(() => {
								if (!completed) {
									buildProcess.kill("SIGKILL");
									complete(false, "build timed out and was killed");
								}
							}, 5000);
						}
					},
					2 * 60 * 1000,
				); // 2 minutes

				// Clean up timeout when process completes
				buildProcess.on("close", () => {
					clearTimeout(timeout);
				});
			});

			console.info(
				`🎉 ${projectName} build process completed, checking for queued builds...`,
			);
		} catch (err) {
			console.warn(`Failed to build ${projectName}:`, err);
		} finally {
			isBuilding = false;

			// Process any queued builds
			if (buildQueue.size > 0) {
				const nextBuild = buildQueue.values().next().value;
				buildQueue.delete(nextBuild);
				const nextProjectName = nextBuild.includes("AeroSandbox")
					? "AeroSandbox"
					: "aeroSW";
				console.info(`🔄 Processing queued build for ${nextProjectName}`);
				setTimeout(() => runBuild(nextBuild, nextProjectName), 100);
			} else {
				console.info("✨ All builds completed, no queued builds remaining");
			}
		}
	}

	/**
	 * Debounced build function that waits for a period of inactivity before triggering build
	 * Prevents rapid successive builds when multiple files change quickly
	 * @param projectPath - Absolute path to the project directory
	 * @param projectName - Human-readable name of the project for logging
	 */
	function debouncedBuild(projectPath: string, projectName: string) {
		// Clear existing timeout for this project
		const existingTimeout = buildTimeouts.get(projectName);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		console.info(
			`⏱️  ${projectName} file changed, waiting ${debounceDelay}ms for more changes...`,
		);

		// Set new timeout
		const timeout = setTimeout(() => {
			buildTimeouts.delete(projectName);
			runBuild(projectPath, projectName);
		}, debounceDelay);

		buildTimeouts.set(projectName, timeout);
	}

	return {
		name: "vite-build-watch",
		async configureServer() {
			// Only activate file watching in debug mode
			if (!debug) {
				console.info("📴 Build watching disabled (not in debug mode)");
				return;
			}

			const aeroSWSourcePath = resolve(__dirname, "../", "aeroSW", "src");
			const aeroSandboxSourcePath = resolve(
				__dirname,
				"../",
				"AeroSandbox",
				"src",
			);

			// Check if builds are needed and trigger them
			console.info("🔍 Checking for missing dist files...");

			const needsAeroSWBuild = !hasFiles(aeroPath);
			const needsAeroSandboxBuild = !hasFiles(aeroSandboxPath);

			if (needsAeroSWBuild || needsAeroSandboxBuild) {
				console.info("📦 Missing dist files detected, triggering builds...");

				// Build AeroSandbox first since aeroSW might depend on it
				if (needsAeroSandboxBuild) {
					console.info("🚀 AeroSandbox dist not found, building...");
					await runBuild(
						resolve(__dirname, "../", "AeroSandbox"),
						"AeroSandbox",
					);
					console.info("🔄 AeroSandbox build completed, checking aeroSW...");
				}

				if (needsAeroSWBuild) {
					console.info("🚀 aeroSW dist not found, building...");
					await runBuild(aeroSWPath, "aeroSW");
					console.info("🔄 aeroSW build completed");
				}

				console.info("✨ Initial builds completed");
			} else {
				console.info("✅ All dist files present");
			}

			// Set up file watchers for source changes
			console.info("🔍 Setting up file watchers for source directories...");

			// Watch aeroSW `src` directory
			watch(aeroSWSourcePath, { ignored: /(^|[\/\\])\../ }).on(
				"change",
				(path) => {
					console.info(`📁 aeroSW source changed: ${path}`);
					debouncedBuild(aeroSWPath, "aeroSW");
				},
			);

			// Watch AeroSandbox `src` directory
			watch(aeroSandboxSourcePath, { ignored: /(^|[\/\\])\../ }).on(
				"change",
				(path) => {
					console.info(`📁 AeroSandbox source changed: ${path}`);
					debouncedBuild(
						resolve(__dirname, "../", "AeroSandbox"),
						"AeroSandbox",
					);
				},
			);

			console.info("👀 File watching active");

			// Set up automatic `git pull` if enabled
			if (autoUpdate) {
				console.info(
					`🔄 Auto-update enabled: git pull every ${AUTO_UPDATE_INTERVAL / 60000} minutes`,
				);

				// Run initial git pull
				await runGitPull();

				// Set up recurring timer
				setInterval(() => {
					runGitPull();
				}, AUTO_UPDATE_INTERVAL);
			} else {
				console.info(
					"📴 Auto-update disabled (set AUTO_UPDATE=true to enable)",
				);
			}
		},
	};
}

export default defineConfig({
	server: {
		port: 2525,
	},
	plugins: [
		[
			dreamlandPlugin(),
			viteWispPlugin(),
			viteBuildWatchPlugin(),
			viteStaticCopy({
				targets: [
					{
						src: `${aeroSWPath}/examples/swWithExtras.js`,
						dest: ".",
						rename: "sw.js",
						overwrite: false,
					},
					{
						src: `${aeroSWPath}/examples/config.js`,
						dest: "aero",
						rename: "config.js",
						overwrite: false,
					},
					{
						src: `${baremuxPath}/**/*`,
						dest: "baremux",
						overwrite: false,
					},
					{
						src: `${resolve(__dirname, "../", "AeroSandbox", "dist", debug ? "debug" : "prod")}/**/*`,
						dest: "aero/AeroSandbox",
						overwrite: false,
					},
					{
						src: `${resolve(aeroSWPath, "dist", debug ? "debug" : "prod")}/**/*`,
						dest: "aero",
						overwrite: false,
					},
					{
						src: `${epoxyPath}/**/*`,
						dest: "epoxy",
						overwrite: false,
					},
					{
						src: `${libcurlPath}/**/*`,
						dest: "libcurl",
						overwrite: false,
					},
				],
				watch: {
					reloadPageOnChange: true,
				},
			}),
		],
	],
});
