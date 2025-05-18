/*
Description: Initializes BareMux transport for browser redirects
*/
import { BareMuxConnection } from "@mercuryworkshop/bare-mux";

export async function initBareMux(): Promise<void> {
	const connection = new BareMuxConnection("/baremux/worker.js");
	const transport =
		localStorage.getItem("transport-path") ?? "/libcurl/index.mjs";

	const wispUrl =
		localStorage.getItem("wisp-url") ??
		`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
	const bareUrl =
		localStorage.getItem("bare-url") ??
		`${location.protocol}//${location.host}/bare/`;

	if (transport === "/baremod/index.mjs") {
		if ((await connection.getTransport()) !== transport) {
			await connection.setTransport(transport, [bareUrl]);
			console.log("set");
		}
		return;
	}
	if ((await connection.getTransport()) !== transport) {
		await connection.setTransport(transport, [{ wisp: wispUrl }]);
		console.log("set");
	}
}