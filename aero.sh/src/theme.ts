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
	sourceColorHex: string = DEFAULT_SOURCE_COLOR_HEX,
	isDark: boolean,
	target: HTMLElement = document.body,
): void {
	const sourceColorARGB = argbFromHex(sourceColorHex);
	const theme = themeFromSourceColor(sourceColorARGB, []);

	applyTheme(theme, { target, dark: isDark });

	// Explicitly set body background and text color using the generated scheme
	const scheme = isDark ? theme.schemes.dark : theme.schemes.light;

	target.style.backgroundColor = hexFromArgb(scheme.surface);
	target.style.color = hexFromArgb(scheme.onSurface);
}
