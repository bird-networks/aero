{
	function wrapLink(link) {
		const wrappedLink = link.replace(/:\d+:\d+$/g, "");

		return `<a href="${wrappedLink}">${wrappedLink}</a>`;
	}

	function fmtErr(stack) {
		return (
			stack
				// Put locations on a new line and tab
				.split("at ")
				.map((loc) => loc.replace(/^(http:|https:).+/gm, (m) => wrapLink(m)))
				.join("<br>&emsp;")
				// Bold the error
				.replace(/(^[^:]*)(?:: )([^:]*)/g, "<b>$1</b>: <i>$2</i>")
				// Format the links
				.replace(/\(([^()]*)\)/gms, (_m, g1) => `(${wrapLink(g1)})`)
		);
	}

	/**
	 * Creates an error page for a given error
	 * @param {Error} err - The error to create a page for
	 * @param {string} proxyName - The name of the proxy
	 * @param {boolean} expected - Whether the error was expected (was it caught by the proxy?)
	 * @returns {Response} - The error page
	 */
	function createErrPage(err, proxyName, expected = false) {
		return new Response(
			  /* html */`
            <!DOCTYPE html>
            <html>
                <body>
                    <style>
                        body {
                            font-family: arial, sans-serif;
                        }
                        #err {
                            font-family: monospace;
                        }
                    </style>
                    <h1 id="title" style="color: red">${proxyName} Bug (${expected ? "Caught" : "Unexpected"})</h1>
                    <p id="err">${fmtErr(err.stack)}<br>${err.cause}<p>
                </body>
            </html>
            `,
			{ headers: { "content-type": "text/html" }, status: 500 },
		);
	}

	/**
	 * Patches the original aero handler to add a custom error page
	 * @param {function} originalHandle - The original aero handler
	 * @param {string?} proxyName - The name of the proxy (default: "aero")
	 * @returns {function} - The patched aero handler
	 */
	self.patchAeroHandler = (originalHandle, proxyName = "aero") => {
		console.debug("[aero Extras] Patching aero handler");
		return async (event) => {
			console.debug("[aero Extras] Routing request");
			try {
				const result = await originalHandle(event);

				return result.match(
					(response) => response,
					(err) => {
						console.error("[aero Extras] Caught error", err);
						return createErrPage(err, proxyName, true);
					}
				);
			} catch (err) {
				console.error("[aero Extras] Unexpected error during event handling", err);
				return createErrPage(err, proxyName, false);
			}
		};
	};
}
