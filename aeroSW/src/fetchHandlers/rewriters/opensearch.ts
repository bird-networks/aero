/**
 * @module
 * This module is for rewriting OpenSearch XML files in proxies.
 * 
 * This isn't a usual standard because it is from a standards organization that is a one-time thing, 
 * but they seem to have abandoned their docs page. However, the standard is one of the most widely 
 * used standards on the web, and OpenSearch will continue to be used until the end of the web.
 * 
 * You can find the docs here - @see https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md
 * @see https://www.chromium.org/tab-to-search/
 * @see https://developer.mozilla.org/en-US/docs/Web/OpenSearch
 * 
 * This rewriter shouldn't be used if the feature flag `REWRITE_OPENSEARCH` is disabled
 * 
 * Examples:
 * @see https://ladsweb.modaps.eosdis.nasa.gov/tools-and-services/lws-classic/xml/opensearch.xml
 */

import type { ResultAsync } from "neverthrow";
import { okAsync, errAsync } from "neverthrow";

import type { AeroLogger } from "$shared/Loggers";

import { parseDocument } from "htmlparser2";
import type { Element } from "domhandler";


import rewriteSrc from "$util/src";


/**
 * Rewrites OpenSearch XML files for proxy usage
 * @param body - The OpenSearch XML content to rewrite
 * @returns The rewritten OpenSearch XML
 */
export default async function rewriteOpensearch(body: string): Promise<ResultAsync<string, Error>> {
	const { logger } = self as unknown as { logger: AeroLogger };
	try {
		const doc = parseDocument(body, {
			xmlMode: true
		});

		// Find and rewrite URL elements in OpenSearch XML
		doc.children.forEach(child => {
			if (child.type === "tag" && (child as Element).name === "OpenSearchDescription") {
				const element = child as Element;
				element.children?.forEach(node => {
					if (node.type === "tag" && (node as Element).name === "Url") {
						const urlElement = node as Element;
						const templateAttr = urlElement.attribs?.template;
						if (templateAttr) {
							urlElement.attribs.template = rewriteSrc(templateAttr, location.origin, logger);
						}
					}
				});
			}
		});

		// Serialize back to XML string
		const rewrittenXML = doc.toString();

		return okAsync(rewrittenXML);
	} catch (err) {
		return errAsync(new Error(`Failed to rewrite OpenSearch XML: ${err instanceof Error ? err.message : String(err)}`));
	}
}