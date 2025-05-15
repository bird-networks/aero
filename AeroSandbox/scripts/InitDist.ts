// This is already defined in the global scope of Node, but not for Deno
const process = require("node:process");

const { access, copyFile, mkdir, rm } = require("node:fs/promises");
const path = require("node:path");

// Neverthrow
import type { Result } from "neverthrow";
const { ok: nOk, err: nErr, fromPromise } = require("neverthrow");

// CJS global __dirname is available, no manual assignment needed

/**
 * This interface defines the directories that will be used by the `InitDist` class
 */
interface Dirs {
	dist: string;
	proper: string;
}

/**
 * This class initializes everything in the build folder to prepare for Rspack to build into there
 * @example
 * ...
 * const verboseMode = !("VERBOSE" in process.env) || process.env.VERBOSE !== "false";
 * ...
 * const properDirType = debugMode ? "debug" : "prod";
 * 
 * const initDist = new InitDist(
 * 	{
 * 		dist: path.resolve(__dirname, "dist"),
 * 		proper: path.resolve(__dirname, "dist", properDirType),
 * 		sw: path.resolve(__dirname, "dist", properDirType, "sw")
 * 	}, 
 * 	properDirType,
 * 	verboseMode
 * );
 */
export default class InitDist {
	distDir: string;
	properDir: string;
	properDirType: string;
	logStatus: boolean;

	constructor(dirs: Dirs, properDirType: string, logStatus: boolean) {
		this.distDir = dirs.dist;
		this.properDir = dirs.proper;
		this.properDirType = properDirType;
		this.logStatus = logStatus;
	}

	async init(): Promise<Result<void, Error>> {
		if (this.logStatus) console.info("Initializing the dist folder");

		// @ts-ignore We know this is an error type
		const accessResult = await fromPromise(access(this.distDir), (err: Error) => err);
		if (accessResult.isErr())
			// We expect this to error and it is fine if it does. We are merely doing this to check if the folder exists.
			return this.createDistDir();
		return this.initProperDir();
	}

	async createDistDir(): Promise<Result<void, Error>> {
		if (this.logStatus) console.info("Creating the dist folder");

		// @ts-ignore We know this is an error type
		const mkdirRes = await fromPromise(mkdir(this.distDir, { recursive: true }), (err: Error) => new Error(`Failed to create dist directory: ${err.message}`));
		if (mkdirRes.isErr())
			return nErr(mkdirRes.error);
		return this.initProperDir();
	}

	async initProperDir(): Promise<Result<void, Error>> {
		if (this.logStatus)
			console.info("Initializing the proper folder (...dist/<debug/prod>)");

		// @ts-ignore We know this is an error type
		const accessResult = await fromPromise(access(this.properDir), (err: Error) => err);
		if (accessResult.isErr())
			// We expect this to error and it is fine if it does. We are merely doing this to check if the folder exists.
			return this.createProperDir();

		// @ts-ignore We know this is an error type
		const rmRes = await fromPromise(rm(this.properDir, { recursive: true }), (err: Error) => new Error(`Failed to remove proper folder: ${err.message}`));
		if (rmRes.isErr())
			// Travel the error up the chain to eventually be handled by whomever called `init`
			return nErr(rmRes.error);

		return this.createProperDir();
	}

	async createProperDir(): Promise<Result<void, Error>> {
		if (this.logStatus) console.info("Creating the proper folder");

		// @ts-ignore We know this is an error type
		const mkdirRes = await fromPromise(mkdir(this.properDir, { recursive: true }), (err: Error) => new Error(`Failed to create proper folder: ${err.message}`));
		if (mkdirRes.isErr())
			// Travel the error up the chain to eventually be handled by whomever called `init`
			return nErr(mkdirRes.error);
		return this.createDistBuild();
	}

	async createDistBuild(): Promise<Result<void, Error>> {
		if (this.logStatus)
			console.info("Copying over the default config to the dist folder");

		// @ts-ignore We know this is an error type
		const source = path.resolve(__dirname, "../src/defaultConfig.js")
		const dest = path.resolve(this.properDir, "defaultConfig.js")
		const copyRes = await fromPromise(copyFile(source, dest), (err: Error) => new Error(`Failed to copy the default config: ${err.message}`));
		if (copyRes.isErr())
			// Travel the error up the chain to eventually be handled by whomever called `init`
			return nErr(copyRes.error);

		console.info("Default config copied successfully");
		return nOk(undefined);
	}
}

// CLI detection
const isCLI = require.main === module
if (isCLI) {
	(async () => {
		const properDirType = "DEBUG" in process.env ? "debug" : "prod"
		const dirs = {
			dist: path.resolve(__dirname, "..", "dist"),
			proper: path.resolve(__dirname, "dist", properDirType),
		}
		const initDist = new InitDist(dirs, properDirType, true)
		const result = await initDist.init()
		result.match(
			() => console.info("Successfully the globals for TS"),
			(err) => console.error(`Unable to initialize the globals for TS: ${err.message}`)
		)
	})()
}
