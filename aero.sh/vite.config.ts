import { defineConfig } from "vite";
import { dreamlandPlugin } from "vite-plugin-dreamland";

import { resolve } from "node:path";

import { viteStaticCopy } from "vite-plugin-static-copy";

import wisp from "wisp-server-node";
// @ts-ignore
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const debug = process.env.DEBUG === "true" || process.env.DEBUG === "1" || false;

const __dirname = import.meta.dirname;

const aeroSandboxPath = resolve(__dirname, "../", "AeroSandbox", "dist", debug ? "debug" : "prod");
const aeroPath = resolve(__dirname, "../", "aeroSW", "dist", debug ? "debug" : "prod");

export default defineConfig({
	server: {
		port: 2525,
	},
	plugins: [[
		dreamlandPlugin(),
		viteStaticCopy({
			targets: [
				{
					src: `${aeroSandboxPath}`,
					dest: "aero/AeroSandbox",
					overwrite: false
				},
				{
					src: `${aeroPath}`,
					dest: "aero",
					overwrite: false
				},
				{
					src: `${epoxyPath}`,
					dest: "epoxy",
					overwrite: false
				},
				{
					src: `${libcurlPath}`,
					dest: "libcurl",
					overwrite: false
				},

			]
		})
	]],
});
