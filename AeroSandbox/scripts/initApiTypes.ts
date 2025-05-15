import path from "node:path";
import { access, mkdir } from "node:fs/promises";
import { writeFileSync, existsSync } from "node:fs";

import type { Result } from "neverthrow";
import { ok as nOk, err as nErr } from "neverthrow";

/**
 * For WebIDL -> TS conversion
 * I shouldn't have to do this, but they forgot to include the "exports" definition inside their package.json, and I don't want to maintain a fork. They also defined exports for these modules in their index.js, which should be enough by itself, but they invoked the CLI, making this useless since that action throws an error.
 */
const fetchIDLModPath = path.resolve(
	__dirname,
	"..",
	"node_modules",
	"@milkshakeio",
	"webidl2ts",
	"dist",
	"fetch-idl.js",
);
const fetchIDLMod = require(fetchIDLModPath);
const fetchIDL = fetchIDLMod.fetchIDL;
const parseIDLModPath = path.resolve(
	__dirname,
	"..",
	"node_modules",
	"@milkshakeio",
	"webidl2ts",
	"dist",
	"parse-idl.js",
);
const parseIDLMod = require(parseIDLModPath);
const parseIDL = parseIDLMod.parseIDL;
const convertIDLModPath = path.resolve(
	__dirname,
	"..",
	"node_modules",
	"@milkshakeio",
	"webidl2ts",
	"dist",
	"convert-idl.js",
);
const convertIDLMod = require(convertIDLModPath);
const convertIDL = convertIDLMod.convertIDL;
const printTsModPath = path.resolve(
	__dirname,
	"..",
	"node_modules",
	"@milkshakeio",
	"webidl2ts",
	"dist",
	"print-ts.js",
);
const printTsMod = require(printTsModPath);
const printTs = printTsMod.printTs;

const webIDLOutputDir = path.resolve(__dirname, "types/webidlDist");

type webIDLDescs = { [key: string]: string };
const webIDLUsedInAero: webIDLDescs = {
	"cookie-store": "https://wicg.github.io/cookie-store/",
	// fedcm: "https://fedidcg.github.io/FedCM/", FIXME: Broken
	// "shared-storage": "https://wicg.github.io/shared-storage/", FIXME: Makes the build hang for some reason
	"web-app-launch": "https://wicg.github.io/web-app-launch/",
	"web-otp": "https://wicg.github.io/web-otp/",
};

// Gens to types/webidlDist
export default function genWebIDL(
	logStatus: boolean,
	webIDL = webIDLUsedInAero,
): Result<void, Error> {
	if (logStatus) console.log("\nGenerating the WebIDL -> TS conversions required in aero");
	access(webIDLOutputDir).catch(() => mkdir(webIDLOutputDir, { recursive: true }));
	for (const [apiName, apiDocURL] of Object.entries(webIDL)) {
		const outFile = path.resolve(webIDLOutputDir, `${apiName}.d.ts`);
		if (existsSync(outFile)) {
			if (logStatus) console.log(`Skipping WebIDL generation for ${apiName}; file exists`);
			continue;
		}
		if (logStatus) console.log(`Fetching the WebIDL for ${apiName} with URL ${apiDocURL}`);
		fetchIDL(apiDocURL).then((rawIdl) => {
			if (logStatus) console.log(`Fetched the WebIDL for ${apiName}`);
			const ast = parseIDL(rawIdl);
			const converted = convertIDL(ast);
			const tsContent = printTs(converted);
			writeFileSync(outFile, tsContent);
		}).catch((err: unknown) => {
			console.error(`Error generating WebIDL for ${apiName}:`, err);
		});
	}
	return nOk(undefined);
}
