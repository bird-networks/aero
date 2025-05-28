import { defineConfig } from "vite";
import { dreamlandPlugin } from "vite-plugin-dreamland";
import type { Plugin } from "vite";

import { resolve } from "node:path";

import { viteStaticCopy } from "vite-plugin-static-copy";

import wisp from "wisp-server-node";
// @ts-ignore: r58 is an idiot
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const debug = process.env.DEBUG === "true" || process.env.DEBUG === "1" || false;

const __dirname = import.meta.dirname;

const aeroSWPath = resolve(__dirname, "../", "aeroSW");
const aeroSandboxPath = resolve(__dirname, "../", "AeroSandbox", "dist", debug ? "debug" : "prod");
const aeroPath = resolve(aeroSWPath, "dist", debug ? "debug" : "prod");

/** Provides for Vite to serve the wisp server */
function viteWispPlugin(): Plugin {
	return {
		name: "vite-wisp-server",
		configureServer(server) {
			server.httpServer?.on("upgrade", (req, socket, head) => {
				console.log("wisp upgrade", req.url);
				if (req.url.startsWith("/wisp"))
					wisp.routeRequest(req, socket, head)
			});
		}
	};
};

export default defineConfig({
	server: {
		port: 2525,
	},
	plugins: [[
		dreamlandPlugin(),
		viteWispPlugin(),
		viteStaticCopy({
			targets: [
				{
					src: `${aeroSWPath}/examples/swWithExtras.js`,
					dest: "/",
					rename: "sw.js",
					overwrite: false
				},
				{
					src: `${aeroSWPath}/examples/config.js`,
					dest: "aero",
					rename: "config.js",
					overwrite: false
				},
				{
					src: `${baremuxPath}/**/*`,
					dest: "baremux",
					overwrite: false
				},
				{
					src: `${aeroSandboxPath}/**/*`,
					dest: "aero/AeroSandbox",
					overwrite: false
				},
				{
					src: `${aeroPath}/**/*`,
					dest: "aero",
					overwrite: false
				},
				{
					src: `${epoxyPath}/**/*`,
					dest: "epoxy",
					overwrite: false
				},
				{
					src: `${libcurlPath}/**/*`,
					dest: "libcurl",
					overwrite: false
				}
			]
		})
	]],
});
