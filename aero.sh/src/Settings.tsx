/// <reference types="dreamland" />

// Material Web Components
import "@material/web/list/list.js";
import "@material/web/list/list-item.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/icon/icon.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import "@material/web/divider/divider.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/switch/switch.js";

// Import search engine store and configurations
import {
	searchEngineStore,
	AVAILABLE_SEARCH_ENGINES,
} from "./searchEngineStore.js";

// Import wisp backend store
import {
	wispBackendStore,
	getDefaultWispUrlForDisplay,
} from "./wispBackendStore.js";

/** Available settings pages */
const SETTINGS_PAGES = [
	{ id: "proxy", label: "Proxy", icon: "language" },
	{ id: "baremux", label: "BareMux Transports", icon: "swap_horiz" },
	{ id: "middleware", label: "Proxy Middleware", icon: "layers" },
	{ id: "site", label: "Site Settings", icon: "tune" },
] as const;

type SettingsPageId = (typeof SETTINGS_PAGES)[number]["id"];

// Global store for settings state
const settingsStore = $store(
	{ isOpen: false },
	{ ident: "aero-settings-state", backing: "localstorage", autosave: "auto" },
);

// Ensure settings start closed and clear any cached state
settingsStore.isOpen = false;
document.body.classList.remove("settings-active");

/** Global function to open settings */
export const openSettings = () => {
	settingsStore.isOpen = true;
	document.body.classList.add("settings-active");
};

/** Global function to close settings */
export const closeSettings = () => {
	settingsStore.isOpen = false;
	document.body.classList.remove("settings-active");
};

// Initialize settings state on load to clear any leftover open state
settingsStore.isOpen = false;
document.body.classList.remove("settings-active");

/**
 * Settings component with sidebar navigation following Material UI guidelines
 * Provides access to proxy configuration, BareMux transports, and middleware settings
 */
const Settings: Component<
	Record<string, never>,
	{
		/** Currently active settings page */
		activePage: SettingsPageId;
		/** Whether the navigation rail is in its collapsed (icon-only) state */
		isRailCollapsed: boolean;
	}
> = function () {
	this.activePage = "proxy";
	this.isRailCollapsed = true;

	const selectPage = (pageId: SettingsPageId) => {
		this.activePage = pageId;
	};

	const toggleRailCollapse = () => {
		this.isRailCollapsed = !this.isRailCollapsed;
	};

	const handleWispUrlChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		wispBackendStore.customWispUrl = target.value;
	};

	const toggleCustomWispUrl = () => {
		wispBackendStore.useCustomUrl = !wispBackendStore.useCustomUrl;
	};

	// Handle escape key to close settings
	this.mount = () => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && settingsStore.isOpen) {
				closeSettings();
			}
		};
		document.addEventListener("keydown", handleKeydown);
		return () => document.removeEventListener("keydown", handleKeydown);
	};

	this.css = /* css */ `
		.settings-sidebar {
			width: 280px; /* Expanded width */
			background-color: var(--md-sys-color-surface-container);
			display: flex;
			flex-direction: column;
			flex-shrink: 0;
			align-items: stretch; /* Stretch items in expanded view */
			padding: 0; /* Remove rail-specific padding, handle in header/nav */
			transition: width 0.3s cubic-bezier(0.2, 0, 0, 1); /* Animate width change */
		}

		.settings-header {
			display: flex;
			flex-direction: row; /* Toggle on left, close on right */
			align-items: center;
			justify-content: space-between; /* Space out toggle and close */
			padding: 12px 16px; /* Standard padding */
			height: 56px; /* Standard M3 top app bar height */
			/* gap: 8px; Removed, using justify-content */
		}

		.rail-toggle-btn {
			--md-icon-button-icon-color: var(--md-sys-color-on-surface-variant);
			--md-icon-button-container-shape: 12px;
		}

		.settings-title {
			font-size: 1.25rem;
			font-weight: 500;
			color: var(--md-sys-color-on-surface);
			margin: 0 auto;
			font-family: "Google Sans", sans-serif;
		}

		.settings-nav {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
			padding: 8px 16px;
		}

		.settings-nav-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			width: 100%;
			min-height: 56px;
			height: auto;
			padding: 0 16px;
			border: none;
			background: none;
			cursor: pointer;
			transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
			color: var(--md-sys-color-on-surface-variant);
			text-align: left; /* Align text to left */
			font-family: "Google Sans", sans-serif;
			font-size: 0.875rem; /* M3 Label Large */
			font-weight: 500;
			border-radius: 28px; /* Fully rounded for M3 nav drawer item */
			position: relative;
		}

		.settings-nav-item:hover {
			background-color: var(--md-sys-color-surface-container-high);
			color: var(--md-sys-color-on-surface);
		}

		.settings-nav-item.active {
			background-color: var(--md-sys-color-secondary-container);
			color: var(--md-sys-color-on-secondary-container);
		}

		.settings-nav-item.active .settings-nav-icon {
			color: var(--md-sys-color-on-secondary-container);
		}

		.settings-nav-icon {
			color: var(--md-sys-color-on-surface-variant);
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 16px;
			margin-bottom: 0;
		}

		.settings-nav-item:hover .settings-nav-icon {
			color: var(--md-sys-color-on-surface);
		}

		.settings-nav-label {
			font-size: 0.875rem; /* M3 Label Large */
			line-height: 1.4;
			white-space: nowrap; /* No wrapping in expanded view */
			text-align: left;
			/* max-width: 100%; Removed */
			display: block; /* Keep as block or rely on flex item display computation */
			flex-grow: 1; /* Allow label to take available space */
			min-width: 0; /* Crucial for text-overflow in flex items */
			-webkit-line-clamp: unset;
			-webkit-box-orient: unset;
			overflow: hidden;
			text-overflow: ellipsis; /* Truncate if needed */
		}

		/* Collapsed Rail (Icon-Only) Styles - This is now the default appearance */
		.settings-sidebar.rail-collapsed {
			width: 80px;
			align-items: center; /* Center items in collapsed rail */
			padding: 0; /* Reset padding */
		}

		.settings-sidebar.rail-collapsed .settings-header {
			flex-direction: column; /* Stack toggle and close */
			justify-content: flex-start;
			align-items: center; /* Ensure buttons are centered horizontally */
			gap: 8px;
			padding: 12px 0; /* Vertical padding for centered buttons */
			height: auto;
		}

		.settings-sidebar.rail-collapsed .settings-close-btn {
      /* Place close button at the top */
			order: -1;
		}

		.settings-sidebar.rail-collapsed .settings-title {
			display: none;
		}

		.settings-sidebar.rail-collapsed .settings-nav {
			padding: 12px 0;
			align-items: center;
		}
		
		.settings-sidebar.rail-collapsed .settings-nav-item {
			flex-direction: column;
			justify-content: center;
			width: 72px;
			height: 56px;
			padding: 0;
			border-radius: 16px;
		}

		.settings-sidebar.rail-collapsed .settings-nav-icon {
      /** Center icon */
			margin-right: 0;
			margin-bottom: 0;
		}

		.settings-sidebar.rail-collapsed .settings-nav-label {
			display: none;
		}

		.settings-content {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			background-color: var(--md-sys-color-surface-container-lowest);
		}

		.settings-content-header {
			padding: 24px 32px 16px;
			border-bottom: 1px solid var(--md-sys-color-outline-variant);
		}

		.settings-content-title {
			font-size: 1.75rem;
			font-weight: 400;
			color: var(--md-sys-color-on-surface);
			margin: 0 0 8px 0;
			font-family: "Google Sans", sans-serif;
		}

		.settings-content-description {
			font-size: 0.875rem;
			color: var(--md-sys-color-on-surface-variant);
			margin: 0;
			font-family: "Google Sans", sans-serif;
		}

		.settings-content-body {
			flex: 1;
			padding: 24px 32px;
			overflow-y: auto;
		}

		.settings-section {
			margin-bottom: 32px;
		}

		.settings-section:last-child {
			margin-bottom: 0;
		}

		.settings-section-title {
			font-size: 1.125rem;
			font-weight: 500;
			color: var(--md-sys-color-on-surface);
			margin: 0 0 16px 0;
			font-family: "Google Sans", sans-serif;
		}

		.settings-placeholder {
			color: var(--md-sys-color-on-surface-variant);
			font-style: italic;
			padding: 20px;
			background-color: var(--md-sys-color-surface-container);
			border-radius: 16px;
			border: 1px dashed var(--md-sys-color-outline-variant);
			font-family: "Google Sans", sans-serif;
		}

		.settings-form-field {
			margin-bottom: 24px;
		}

		.settings-form-field:last-child {
			margin-bottom: 0;
		}

		.settings-select {
			width: 100%;
			max-width: 320px;
			--md-outlined-select-text-field-container-shape: 16px;
			--md-outlined-select-text-field-focus-outline-color: var(--md-sys-color-primary);
			--md-outlined-select-text-field-hover-outline-color: var(--md-sys-color-on-surface-variant);
			--md-outlined-select-text-field-outline-color: var(--md-sys-color-outline);
			--md-outlined-select-text-field-supporting-text-color: var(--md-sys-color-on-surface-variant);
			--md-outlined-select-text-field-label-text-color: var(--md-sys-color-on-surface-variant);
			--md-outlined-select-text-field-input-text-color: var(--md-sys-color-on-surface);
		}

		.settings-text-field {
			width: 100%;
			max-width: 480px;
			--md-outlined-text-field-container-shape: 16px;
			--md-outlined-text-field-focus-outline-color: var(--md-sys-color-primary);
			--md-outlined-text-field-hover-outline-color: var(--md-sys-color-on-surface-variant);
			--md-outlined-text-field-outline-color: var(--md-sys-color-outline);
			--md-outlined-text-field-supporting-text-color: var(--md-sys-color-on-surface-variant);
			--md-outlined-text-field-label-text-color: var(--md-sys-color-on-surface-variant);
			--md-outlined-text-field-input-text-color: var(--md-sys-color-on-surface);
		}

		.settings-switch-row {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 16px;
			margin-bottom: 16px;
		}

		.settings-switch-label {
			font-size: 0.875rem;
			font-weight: 500;
			color: var(--md-sys-color-on-surface);
			font-family: "Google Sans", sans-serif;
		}

		.default-url-display {
			font-size: 0.75rem;
			color: var(--md-sys-color-on-surface-variant);
			font-family: "Google Sans", monospace;
			background-color: var(--md-sys-color-surface-container);
			padding: 8px 12px;
			border-radius: 8px;
			margin-top: 8px;
		}

		/* Mobile responsive */
		@media screen and (max-width: 768px) {
			.settings-overlay {
				flex-direction: column;
			}

			.settings-sidebar:not(.rail-collapsed) {
				width: 100%;
			}

			.settings-sidebar.rail-collapsed {
				width: 100%;
				height: auto;
				flex-direction: row;
				padding: 8px 16px;
				justify-content: space-between;
			}
			
			.settings-sidebar.rail-collapsed .settings-header {
				flex-direction: row;
				margin-bottom: 0;
			}

			.settings-sidebar:not(.rail-collapsed) .settings-header {
			}

			.settings-title {
				display: block;
				font-size: 1.125rem;
				font-weight: 500;
				color: var(--md-sys-color-on-surface);
				margin: 0;
				font-family: "Google Sans", sans-serif;
			}

			.settings-sidebar:not(.rail-collapsed) .settings-title {
				margin: 0 auto;
			}


			.rail-toggle-btn {
				order: 1; 
			}

			.settings-close-btn {
				order: 2;
			}

			.settings-sidebar.rail-collapsed .settings-nav {
				flex-direction: row;
				gap: 8px;
				padding: 0;
				flex: 0;
			}

			.settings-sidebar:not(.rail-collapsed) .settings-nav {
				padding: 8px 16px;
			}

			.settings-sidebar.rail-collapsed .settings-nav-item {
				width: 48px; 
				height: 48px;
				padding: 0;
			}

			.settings-sidebar:not(.rail-collapsed) .settings-nav-item {
				width: 100%;
				padding: 0 12px;
				border-radius: 24px;
			}

			.settings-sidebar:not(.rail-collapsed) .settings-nav-icon {
				margin-right: 12px;
			}

			.settings-sidebar:not(.rail-collapsed) .settings-nav-label {
				/* Ensure label is visible and styled for expanded mobile */
				display: block;
				font-size: 0.875rem;
			}

			.settings-content-header {
				padding: 16px 20px 12px;
			}

			.settings-content-body {
				padding: 16px 20px;
			}
		}
	`;

	const renderPageContent = () => {
		switch (this.activePage) {
			case "proxy":
				return (
					<div>
						<div class="settings-content-header">
							<h2 class="settings-content-title">Proxy Settings</h2>
							<p class="settings-content-description">
								Configure functionality of aero
							</p>
						</div>
						<div class="settings-content-body">
							<div class="settings-section">
								<h3 class="settings-section-title">Wisp Backend</h3>
								<div class="settings-switch-row">
									<span class="settings-switch-label">Use custom Wisp URL</span>
									<md-switch
										selected={use(wispBackendStore.useCustomUrl)}
										on:change={toggleCustomWispUrl}
										aria-label="Toggle custom Wisp URL"
									/>
								</div>
								{use(wispBackendStore.useCustomUrl, (useCustom) =>
									useCustom ? (
										<div class="settings-form-field">
											<md-outlined-text-field
												class="settings-text-field"
												label="Custom Wisp URL"
												value={use(wispBackendStore.customWispUrl)}
												on:input={handleWispUrlChange}
												supporting-text="Enter a custom Wisp WebSocket URL (e.g., wss://example.com/wisp/)"
												placeholder="wss://example.com/wisp/"
											/>
										</div>
									) : (
										<div class="default-url-display">
											Default: {getDefaultWispUrlForDisplay()}
										</div>
									),
								)}
							</div>
						</div>
					</div>
				);

			case "baremux":
				return (
					<div>
						<div class="settings-content-header">
							<h2 class="settings-content-title">BareMux Transports</h2>
							<p class="settings-content-description">
								Configure transport methods for BareMux connections
							</p>
						</div>
						<div class="settings-content-body">
							<div class="settings-section">
								<h3 class="settings-section-title">Transport Configuration</h3>
								<div class="settings-form-field">
									<md-outlined-select
										class="settings-select"
										label="Transport Type"
									>
										<md-select-option value="epoxy-tls">
											<div slot="headline">Epoxy-TLS</div>
										</md-select-option>
										<md-select-option value="libcurl">
											<div slot="headline">Libcurl</div>
										</md-select-option>
									</md-outlined-select>
								</div>
							</div>
						</div>
					</div>
				);

			case "middleware":
				return (
					<div>
						<div class="settings-content-header">
							<h2 class="settings-content-title">Proxy Middleware</h2>
							<p class="settings-content-description">
								Configure proxy middleware
							</p>
						</div>
					</div>
				);

			case "site":
				return (
					<div>
						<div class="settings-content-header">
							<h2 class="settings-content-title">Site Settings</h2>
							<p class="settings-content-description">
								Configure general site behavior and preferences
							</p>
						</div>
						<div class="settings-content-body">
							<div class="settings-section">
								<h3 class="settings-section-title">Search Engine</h3>
								<div class="settings-form-field">
									<md-outlined-select
										class="settings-select"
										label="Default Search Engine"
										value={use(searchEngineStore.currentEngineId)}
										on:change={(e: Event) => {
											const select = e.target as HTMLSelectElement;
											searchEngineStore.currentEngineId = select.value;
										}}
									>
										{AVAILABLE_SEARCH_ENGINES.map((engine) => (
											<md-select-option key={engine.id} value={engine.id}>
												<div slot="headline">{engine.name}</div>
											</md-select-option>
										))}
									</md-outlined-select>
								</div>
							</div>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div class="settings-overlay" class:open={use(settingsStore.isOpen)}>
			<div
				class={use(
					this.isRailCollapsed,
					(collapsed) =>
						`settings-sidebar ${collapsed ? "rail-collapsed" : ""}`,
				)}
			>
				<div class="settings-header">
					<md-icon-button
						class="rail-toggle-btn"
						on:click={toggleRailCollapse}
						aria-label="Toggle navigation rail"
					>
						{/* Icon shows action: if collapsed, shows icon to expand; if expanded, shows icon to collapse */}
						<md-icon>
							{use(this.isRailCollapsed, (collapsed) =>
								collapsed ? "menu" : "menu_open",
							)}
						</md-icon>
					</md-icon-button>
					<h1 class="settings-title">Settings</h1>
					<md-icon-button
						class="settings-close-btn"
						on:click={closeSettings}
						aria-label="Close settings"
					>
						<md-icon>close</md-icon>
					</md-icon-button>
				</div>
				<nav class="settings-nav">
					{SETTINGS_PAGES.map((page) => (
						<button
							key={page.id}
							type="button"
							class={use(
								this.activePage,
								(active) =>
									`settings-nav-item ${active === page.id ? "active" : ""}`,
							)}
							on:click={() => selectPage(page.id)}
							aria-label={`Go to ${page.label} settings`}
						>
							<md-icon class="settings-nav-icon">{page.icon}</md-icon>
							<span class="settings-nav-label">{page.label}</span>
						</button>
					))}
				</nav>
			</div>
			<div class="settings-content">
				{use(this.activePage, renderPageContent)}
			</div>
		</div>
	);
};

export default Settings;
