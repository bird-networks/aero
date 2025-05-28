/// <reference types="dreamland" />

// Dreamland
import "dreamland/dev";

// BareMux and Service Worker Initialization
import "./init.js";

// Custom Elements
import "./AeroIframe.js";

// Theme
import { applyAeroTheme } from "./theme.js";

// Material Web Components
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/fab/fab.js";

import { FooterBadges } from "./badges";
import SearchBar from "./Omnibox.tsx";
import Settings, { openSettings } from "./Settings.tsx";

import packageJson from "../../aeroSW/package.json" with { type: "json" };

// Add global style for settings overlay and background hiding
const globalSettingsStyle = document.createElement("style");
globalSettingsStyle.textContent = `
	body.settings-active {
		overflow: hidden !important;
	}
	body.settings-active > :not(.settings-overlay):not(script):not(style) {
		display: none !important;
	}
	.settings-overlay {
		position: fixed !important;
		top: 0 !important;
		left: 0 !important;
		width: 100vw !important;
		height: 100vh !important;
		background-color: var(--md-sys-color-surface-dim) !important;
		z-index: 2147483647 !important;
		display: none !important;
		flex-direction: row;
		opacity: 0;
		transition: opacity 0.3s cubic-bezier(0.2,0,0,1);
		pointer-events: none !important;
	}
	.settings-overlay.open {
		display: flex !important;
		opacity: 1 !important;
		pointer-events: auto !important;
	}
`;
document.head.appendChild(globalSettingsStyle);

/** Preset colors for the theme picker (officially from Material 3 Expressive) */
const PRESET_COLORS = [
	{ name: "Blue", hex: "#4285F4" },
	{ name: "Green", hex: "#34A853" },
	{ name: "Yellow", hex: "#FBBC05" },
	{ name: "Red", hex: "#EA4335" },
	{ name: "Purple", hex: "#8A2BE2" },
];

/** FAB Menu items for theme selection */
const THEME_FAB_ITEMS = PRESET_COLORS.map((color) => ({
	id: color.hex,
	icon: "palette",
	label: color.name,
	color: color.hex,
}));

// Create persistent store for theme settings
const themeStore = $store(
	{
		isDarkMode:
			window.matchMedia?.("(prefers-color-scheme: dark)").matches || false,
		currentSourceColor: PRESET_COLORS[0].hex,
	},
	{
		ident: "aero-theme-settings",
		backing: "localstorage",
		autosave: "auto",
	},
);

/** Main application component */
const App: Component<
	{},
	{
		fabMenuOpen: boolean;
	}
> = function () {
	// Non-persistent state (menu open/close shouldn't survive refresh)
	this.fabMenuOpen = false;

	const refreshTheme = (sourceHex: string, isDark: boolean) => {
		themeStore.currentSourceColor = sourceHex;
		themeStore.isDarkMode = isDark;
		applyAeroTheme(sourceHex, isDark);
	};
	refreshTheme(themeStore.currentSourceColor, themeStore.isDarkMode);

	const toggleDarkMode = () => {
		refreshTheme(themeStore.currentSourceColor, !themeStore.isDarkMode);
	};
	const toggleFabMenu = () => {
		this.fabMenuOpen = !this.fabMenuOpen;
	};
	const selectThemeColor = (colorHex: string) => {
		refreshTheme(colorHex, themeStore.isDarkMode);
		this.fabMenuOpen = false;
	};

	// Click-outside handler for FAB menu
	this.mount = () => {
		const handleClickOutside = (e: MouseEvent) => {
			if (!this.fabMenuOpen) return;

			const fabMenu = document.querySelector(".fab-menu");
			const target = e.target as Node;

			if (!fabMenu?.contains(target)) {
				this.fabMenuOpen = false;
			}
		};

		document.addEventListener("click", handleClickOutside, true);
		return () =>
			document.removeEventListener("click", handleClickOutside, true);
	};

	this.css = `
    html,
    * {
        box-sizing: border-box;
    }

    a {
        text-decoration: none;
        color: inherit;
    }
    a:visited {
        /* Ensures visited links don't turn purple */
        color: inherit;
    }

    html,
    body {
      	height: 100%;
      	margin: 0;
      	padding: 0;
    }

    body {
      	background-color: var(--md-sys-color-surface-container-lowest, #fff);
      	color: var(--md-sys-color-on-surface, #000);
      	font-family: "Google Sans", sans-serif;
      	display: flex;
      	flex-direction: column;
      	justify-content: flex-start;
      	align-items: center;
        min-height: 100vh; 
        height: auto; 
    }

    #app {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    @font-face {
        font-family: "Google Sans";
        src: url("/fonts/GoogleSans-Regular.woff2") format("woff2");
        font-weight: normal;
        font-style: normal;
    }
    
    .app-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 800px; 
        padding: 20px;
    }

    .content-block { 
        width: 100%;
        max-width: 700px;
        margin-bottom: 1.5rem; 
        display: flex;
        justify-content: center;
    }

    .content-block:last-of-type { 
      	margin-bottom: 0;
    }

    .logo-container { 
	      /** Bring the logo closer to the search bar */
      	margin-bottom: 1rem;
    }

    .logo-img { 
      	max-width: 20em;
      	height: auto;  
    }
    
    .search-container-block { 
    }

    .footer-credits { 
      	font-style: italic;
      	color: var(--md-sys-color-on-surface-variant, #777);
      	font-family: "Google Sans", sans-serif;
      	text-align: center;
      	margin-top: 1.5rem; 
    }
    
    /* FAB Menu Styles */
    .fab-menu {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    
    .fab-menu-items {
      	display: flex;
      	flex-direction: column;
      	align-items: flex-end;
      	margin-bottom: 16px;
      	gap: 12px;
    }
    
    .fab-menu-item {
     	display: flex;
    	align-items: center;
     	gap: 12px;
      	transform: translateY(20px) scale(0.8);
      	opacity: 0;
      	transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      	pointer-events: none;
    }
    
    .fab-menu-item.visible {
      	transform: translateY(0) scale(1);
      	opacity: 1;
      	pointer-events: auto;
    }
    
    .fab-menu-item-label {
      	background: var(--md-sys-color-surface-container-high);
      	color: var(--md-sys-color-on-surface);
      	padding: 8px 16px;
      	border-radius: 16px;
      	font-size: 0.875rem;
      	font-weight: 500;
      	white-space: nowrap;
      	box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      	transform: translateX(10px);
      	opacity: 0;
      	transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }
    
    .fab-menu-item.visible .fab-menu-item-label {
        transform: translateX(0);
        opacity: 1;
    }
    
    .fab-menu-item-fab {
        --md-fab-container-color: var(--md-sys-color-surface-container-high);
        --md-fab-icon-color: var(--md-sys-color-on-surface);
    }
    
    .fab-menu-item-fab:hover {
        --md-fab-container-color: var(--md-sys-color-primary-container);
        --md-fab-icon-color: var(--md-sys-color-on-primary-container);
    }
    
    .fab-menu-toggle {
        --md-fab-container-color: var(--md-sys-color-primary-container);
        --md-fab-icon-color: var(--md-sys-color-on-primary-container);
        transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
    }
    
    .fab-menu-toggle.open {
        transform: rotate(45deg);
    }
    
    .fab-menu-toggle:hover {
        --md-fab-container-color: var(--md-sys-color-primary);
        --md-fab-icon-color: var(--md-sys-color-on-primary);
    }

    .dark-mode-fab {
        position: fixed; 
        bottom: 24px; 
        left: 24px; 
        z-index: 1000; 
        --md-fab-container-color: var(--md-sys-color-secondary-container);
        --md-fab-icon-color: var(--md-sys-color-on-secondary-container);
    }

    .footer-links {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: -1rem;
        margin-bottom: 1.5rem;
    }

    @media screen and (max-width: 768px) {
        html {
            padding-top: 0; 
            margin-top: 0; 
            min-height: 100vh; 
            height: auto; 
        }

        body {
            display: flex; 
            align-items: center; 
            padding-top: 0; 
            margin-top: 0; 
            min-height: 100vh; 
            height: auto; 
         }

        #app {
            justify-content: flex-start; 
            padding-top: 0; 
            margin-top: 0; 
            height: auto; 
        }

        .app-container {
            max-width: 100%; 
            justify-content: flex-start; 
        }

        .content-block {
            margin-bottom: 0.75rem; 
        }

        .logo-container.content-block {
            margin-top: 6em;
            margin-bottom: 0.75rem; 
        }
		.logo-img {
			max-width: 16em;
		}
      	.footer-credits.content-block {
        	margin-top: 1.5rem;
      	}
      	.footer-links {
        	margin-top: 0.5rem;
        	margin-bottom: 0.5rem;
      	}
    }

    @media screen and (min-width: 769px) {
      	body {
        	justify-content: center; /* Center content on larger screens */
      	}
    }
  `;

	return (
		<div class="app-container">
			<meta property="og:title" content="aero proxy demo"/>
			<meta property="og:description" content={packageJson.description} />
			<meta property="og:image" content="/imgs/aero.webp" />
			<div class="logo-container content-block">
				<img src="/imgs/aero.webp" alt="Aero Proxy Logo" class="logo-img" />
			</div>
			<SearchBar />
			<div class="footer-credits content-block">
				<p style="margin: 0; padding: 0;">
					Made with ❤️ by <b><a href="https://ryanwilson.space" style="color: var(--md-sys-color-primary)">Ryan Wilson</a></b><br/>
          For the <b><a href="https://browserports.dev" style="color: var(--md-sys-color-primary)">Browser Ports</a></b> project
				</p>
			</div>
			<FooterBadges />

			{/* FAB Menu for Theme Selection */}
			<div class="fab-menu">
				{/* Menu Items */}
				<div class="fab-menu-items">
					{THEME_FAB_ITEMS.map((item, index) => (
						<div
							class={use(
								this.fabMenuOpen,
								(isOpen) => `fab-menu-item ${isOpen ? "visible" : ""}`,
							)}
							style={`transition-delay: ${use(this.fabMenuOpen, (isOpen) => (isOpen ? index * 50 : (THEME_FAB_ITEMS.length - index) * 50))}ms;`}
						>
							<div class="fab-menu-item-label">{item.label}</div>
							<md-fab
								class="fab-menu-item-fab"
								size="small"
								on:click={() => selectThemeColor(item.id)}
								aria-label={`Select ${item.label} theme`}
							>
								<md-icon slot="icon" style={`color: ${item.color};`}>
									palette
								</md-icon>
							</md-fab>
						</div>
					))}
				</div>
				{/* FAB Row: Settings and Theme Switcher */}
				<div style="display: flex; flex-direction: row; align-items: center; gap: 12px;">
					<md-fab class="settings-fab" size="medium" on:click={openSettings} aria-label="Settings">
						<md-icon slot="icon">settings</md-icon>
					</md-fab>
					<md-fab
						class={use(
							this.fabMenuOpen,
							(isOpen) => `fab-menu-toggle ${isOpen ? "open" : ""}`,
						)}
						variant="primary"
						size="medium"
						on:click={toggleFabMenu}
						aria-label={use(this.fabMenuOpen, (isOpen) =>
							isOpen ? "Close theme menu" : "Open theme menu",
						)}
					>
						<md-icon slot="icon">palette</md-icon>
					</md-fab>
				</div>
			</div>

			{/* Dark Mode Toggle FAB */}
			<md-fab
				class="dark-mode-fab"
				size="medium"
				on:click={toggleDarkMode}
				aria-label="Toggle dark mode"
			>
				<md-icon slot="icon">
					{use(themeStore.isDarkMode) ? "light_mode" : "dark_mode"}
				</md-icon>
			</md-fab>
		</div>
	);
};

// Mount once DOM ready
window.addEventListener("load", () => {
	const root = document.getElementById("app")!;
	root.replaceWith(<App />);
	document.body.appendChild(<Settings />);
});
