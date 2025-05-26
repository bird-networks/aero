// Neverthrow
import type { Result } from "neverthrow";
import { ok, err } from "neverthrow";

type simpleReplacement = { [search: string]: string };

/**
 * This is meant to be used for injecting templating into a string that is already pre-made by the `val-plugin`
 * @param valString The string to inject the templating into (usually pre-made by the `val-plugin`)
 * @param htmlTemplating HTML templating goes like - key: `{{REPLACEMENT}}`, value: `replacement`
 * @param jsTemplating JS templating goes like - key: `/**{{REPLACEMENT}}*\/`, value: `replacement`
 * @returns The formatted file with the templating injected
 */
export default function injFmtWrapper(
	valString: string,
	htmlTemplating: simpleReplacement,
	jsTemplating: simpleReplacement,
): Result<string, Error> {
	let code = valString;
	for (const [search, replacement] of Object.entries(htmlTemplating)) {
		try {
			// @ts-ignore
			code = code.replace(new RegExp(`{{${search}}}`, "g"), replacement);
		} catch (error) {
			return err(new Error(
				`Failed to perform replacement to the HTML in the val string ("{{${search}}}" -> "${search}"): ${error instanceof Error ? error.message : String(error)}`
			));
		}
	}
	for (const [search, replacement] of Object.entries(jsTemplating)) {
		try {
			// @ts-ignore
			code = code.replace(new RegExp(`/**{{${search}}}*\/`, "g"), replacement);
		} catch (error) {
			return err(new Error(
				`Failed to perform replacement to the JS in the val string ("/**{{${search}}}*\/" -> "${search}"): ${error instanceof Error ? error.message : String(error)}`
			));
		}
	}
	return ok(code);
}
