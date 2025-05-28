/**
 * Theme setup for Aero using Material Color Utilities
 * This file generates dynamic light and dark color schemes based on a source color
 * and provides a function to apply the theme to the document.
 */

import {
	argbFromHex,
	themeFromSourceColor,
	applyTheme,
	hexFromArgb,
} from "@material/material-color-utilities";

/** Default source color if none is provided to `applyAeroTheme` */
const DEFAULT_SOURCE_COLOR_HEX = "#4285F4";

/**
 * Generates and applies the Material 3 theme (light or dark) to the document body
 * @param sourceColorHex - The hex string for the source color
 * @param isDark - Whether to apply the dark theme
 * @param target - The DOM element to apply the theme to (defaults to document.body)
 */
export function applyAeroTheme(
	// biome-ignore lint/style/useDefaultParameterLast: <explanation>
	sourceColorHex: string = DEFAULT_SOURCE_COLOR_HEX,
	isDark: boolean,
	target: HTMLElement = document.body,
): void {
	const sourceColorARGB = argbFromHex(sourceColorHex);
	const m3theme = themeFromSourceColor(sourceColorARGB, []);

	applyTheme(m3theme, { target, dark: isDark });

	const scheme = isDark ? m3theme.schemes.dark : m3theme.schemes.light;

	target.style.backgroundColor = hexFromArgb(scheme.surface);
	target.style.color = hexFromArgb(scheme.onSurface);

	// Set custom variables for Omnibox based on the current theme (light/dark)
	if (isDark) {
		// Google Dark Theme static colors
		target.style.setProperty("--aero-omnibox-bg", "#303134");
		target.style.setProperty("--aero-omnibox-border", "#444548");
		target.style.setProperty("--aero-omnibox-shadow", "none");
		target.style.setProperty(
			"--aero-omnibox-open-shadow",
			"0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)",
		);
		target.style.setProperty("--aero-omnibox-text", "#e8eaed");
		target.style.setProperty("--aero-omnibox-icon", "#bdc1c6");
		target.style.setProperty("--aero-hairline-color", "#444548");

		target.style.setProperty("--aero-suggestions-bg", "#303134");
		target.style.setProperty("--aero-suggestions-border-spec", "0");
		target.style.setProperty("--aero-suggestions-radius", "0 0 24px 24px");
		target.style.setProperty(
			"--aero-suggestions-shadow",
			"0 4px 6px 0 #171717",
		);
		target.style.setProperty("--aero-suggestions-text", "#e8eaed");
		target.style.setProperty("--aero-suggestions-icon", "#bdc1c6");
		target.style.setProperty("--aero-suggestions-hover-bg", "#3c4043");
	} else {
		// Google Light Theme static colors
		target.style.setProperty("--aero-omnibox-bg", "#fff");
		target.style.setProperty("--aero-omnibox-border", "#dadce0");
		target.style.setProperty(
			"--aero-omnibox-shadow",
			"0px 3px 10px 0px rgba(31, 31, 31, 0.08)",
		);
		target.style.setProperty(
			"--aero-omnibox-open-shadow",
			"0 1px 2px 0 rgba(32,33,36,0.15), 0 1px 3px 1px rgba(32,33,36,0.1)",
		);
		target.style.setProperty("--aero-omnibox-text", "#202124");
		target.style.setProperty("--aero-omnibox-icon", "#5f6368");
		target.style.setProperty("--aero-hairline-color", "#dadce0");

		target.style.setProperty("--aero-suggestions-bg", "#fff");
		target.style.setProperty("--aero-suggestions-border-spec", "0");
		target.style.setProperty("--aero-suggestions-radius", "0 0 24px 24px");
		target.style.setProperty(
			"--aero-suggestions-shadow",
			"0 4px 6px rgba(32, 33, 36, .28)",
		);
		target.style.setProperty("--aero-suggestions-text", "#202124");
		target.style.setProperty("--aero-suggestions-hover-bg", "#f1f3f4");
		target.style.setProperty("--aero-suggestions-icon", "#5f6368");
	}
}
