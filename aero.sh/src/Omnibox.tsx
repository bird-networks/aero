/// <reference types="dreamland" />

// Material Web Components
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/list/list.js";
import "@material/web/list/list-item.js";
import "@material/web/progress/circular-progress.js";
import "@material/web/dialog/dialog.js";
import "@material/web/button/text-button.js";

// Import search engine store and utility
import { getCurrentSearchEngine } from "./searchEngineStore.js";
// Import AeroIframe to ensure it's registered
import "./AeroIframe.js";
// Import iframe utilities
import { openInAeroIframe } from "./iframeUtils.js";
import BareMux from "@mercuryworkshop/bare-mux";

interface Suggestion {
	query: string;
	type: string; // Can be enhanced if suggestions have types
}

// Create a store for the omnibox input
const omniboxStore = $store(
	{ inputValue: "" },
	{ ident: "aero-omnibox-input", backing: "localstorage", autosave: "auto" },
);

// Ensure the store is initialized with an empty string if undefined
if (omniboxStore.inputValue === undefined || omniboxStore.inputValue === null) {
	omniboxStore.inputValue = "";
}

const bareMux = new BareMux();

const Omnibox: Component<
	{},
	{
		/** Suggestions for the omnibox */
		suggestions: Suggestion[];
		/** Whether suggestions are loading */
		isLoadingSuggestions: boolean;
		/** Whether to show suggestions dropdown */
		showSuggestions: boolean;
		/** Reference to the input element */
		inputElement: HTMLInputElement;
	}
> = function () {
	this.suggestions = [];
	this.isLoadingSuggestions = false;
	this.showSuggestions = false;

	let debounceTimeout: number | undefined;

	// Get current search engine config
	const currentEngine = getCurrentSearchEngine();

	const fetchSuggestions = async (query: string) => {
		if (!query.trim()) {
			this.suggestions = [];
			this.showSuggestions = false;
			return;
		}
		this.isLoadingSuggestions = true;
		const suggestUrl = currentEngine.suggestUrlBuilder(query);

		try {
			console.debug(
				`[Suggestions] Fetching suggestions with URL ${suggestUrl}`,
			);

			if (typeof bareMux.fetch !== "function") {
				console.error(
					"[Suggestions] BareMux connection not available or fetch method missing/not a function",
				);
				return;
			}

			console.debug("[Suggestions] BareMux defined, using its fetch");
			let resp: Response;
			try {
				resp = await bareMux.fetch(suggestUrl);
			} catch (err) {
				console.error(
					`[Suggestions] Failed to fetch suggestions with URL ${suggestUrl}`,
					err,
				);
				return;
			}
			if (!resp.ok) {
				console.error(
					`Failed to get search suggestions (status ${resp.status}) from ${suggestUrl}`,
				);
				return;
			}
			const data = await resp.json();
			console.debug("[Suggestions] API response", data);

			const parsedSuggestions = currentEngine.suggestionParser(data);
			this.suggestions = parsedSuggestions.map((s) => ({
				query: s,
				type: "query",
			}));

			console.debug("[Suggestions] Processed suggestions", this.suggestions);
			this.showSuggestions = this.suggestions.length > 0;
		} catch (error) {
			console.error("[Suggestions] Failed to fetch suggestions", error);
			this.suggestions = [];
			this.showSuggestions = false;
		} finally {
			this.isLoadingSuggestions = false;
		}
	};

	/**
	 * Checks if a string is a valid URL.
	 * This is used to determine if the user has entered a URL or a search query.
	 * @param string - The string to check.
	 * @returns A boolean determining if the provided string is a valid URL
	 */
	const isValidURL = (string: string): boolean => {
		try {
			new URL(string);
			return true;
		} catch (_) {
			return false;
		}
	};

	const handleSubmit = async () => {
		this.showSuggestions = false;
		const urlToLoad = omniboxStore.inputValue?.trim() || "";

		if (!urlToLoad) return;

		omniboxStore.inputValue = "";

		const searchEngine = getCurrentSearchEngine();

		let finalUrl: string;
		if (isValidURL(urlToLoad)) {
			finalUrl = urlToLoad;
		} else if (urlToLoad.includes(".") && !urlToLoad.includes(" ")) {
			finalUrl = `https://${urlToLoad}`;
		} else {
			finalUrl = searchEngine.searchUrlBuilder(urlToLoad);
		}

		// Use the shared iframe utility
		await openInAeroIframe(finalUrl);
	};

	const handleSuggestionClick = (suggestion: Suggestion) => {
		omniboxStore.inputValue = suggestion.query;
		this.showSuggestions = false;
		handleSubmit();
	};

	const clearInput = () => {
		omniboxStore.inputValue = "";

		if (this.inputElement) {
			this.inputElement.value = "";

			this.inputElement.dispatchEvent(new Event("input", { bubbles: true }));
			this.inputElement.dispatchEvent(new Event("change", { bubbles: true }));

			this.inputElement.focus();
		}

		this.suggestions = [];
		this.showSuggestions = false;
		this.isLoadingSuggestions = false;
	};

	useChange(omniboxStore.inputValue, () => {
		if (!omniboxStore.inputValue?.trim()) {
			this.suggestions = [];
			this.showSuggestions = false;
			this.isLoadingSuggestions = false;
		}
	});

	this.mount = () => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (this.showSuggestions) {
					this.showSuggestions = false;
				} else if (omniboxStore.inputValue) {
					clearInput();
				}
			}
		};
		document.addEventListener("keydown", handleKeydown);

		const handleClick = (e: MouseEvent) => {
			const dropdown = document.querySelector(".suggestions-container");

			let clickedInsideOmniboxRelatedElements = false;
			if (this.inputElement && this.inputElement.contains(e.target as Node)) {
				clickedInsideOmniboxRelatedElements = true;
			}
			if (dropdown && dropdown.contains(e.target as Node)) {
				clickedInsideOmniboxRelatedElements = true;
			}

			if (!clickedInsideOmniboxRelatedElements) {
				this.showSuggestions = false;
			}
		};
		document.addEventListener("mousedown", handleClick, true);

		return () => {
			document.removeEventListener("keydown", handleKeydown);
			document.removeEventListener("mousedown", handleClick, true);
		};
	};

	this.css = /* css */ `
		@font-face {
			font-family: "Google Sans";
			src: url("/fonts/GoogleSans-Regular.woff2") format("woff2");
			font-weight: normal;
			font-style: normal;
		}
		.omnibox-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			width: 100%;
			margin-top: 0;
		}
		.omnibox-wrapper {
			position: relative;
			margin: 0 auto;
			max-width: 584px;
			width: 100%;
			box-sizing: border-box;
		}
		.omnibox-box {
			display: flex;
			align-items: center;
			padding: 0 16px;
			min-height: 50px;
			height: auto;
			width: 100%;
			box-sizing: border-box;
			border-radius: 26px;
			background: #fff;
			border: 1px solid #dadce0;
			position: relative;
			z-index: 3;
			transition: border-radius 0.15s ease, box-shadow 0.15s ease;
			background-color: var(--aero-omnibox-bg, #fff);
			border: 1px solid var(--aero-omnibox-border, #dadce0);
			box-shadow: var(--aero-omnibox-shadow, 0px 3px 10px 0px rgba(31, 31, 31, 0.08));
			overflow: hidden;
		}

		.omnibox-box.has-suggestions {
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
			box-shadow: var(--aero-omnibox-open-shadow, none);
		}

		.omnibox-box.has-suggestions::after {
			display: block;
			content: "";
			position: absolute;
			bottom: 0;
			left: 16px;
			right: 16px;
			height: 1px;
			background: var(--aero-hairline-color, #dfe1e5);
			z-index: 3;
		}
		.omnibox-input {
			border: none;
			outline: none;
			font-size: 1.25rem;
			background: transparent;
			flex: 1;
			height: 100%;
			font-family: "Google Sans", Arial, sans-serif;
			color: #202124;
			padding: 0 8px 0 20px;
			color: var(--aero-omnibox-text, #202124);
		}

		body.dark-theme .omnibox-input {
			color: #e8eaed;
		}

		.omnibox-input::-webkit-search-cancel-button,
		.omnibox-input::-webkit-search-decoration {
			-webkit-appearance: none;
			appearance: none;
			display: none;
		}
		.omnibox-icon {
			color: #5f6368;
			font-size: 1.5rem;
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--aero-omnibox-icon, #5f6368);
		}

		body.dark-theme .omnibox-icon {
			color: #bdc1c6;
		}

		.omnibox-clear-btn {
			position: absolute;
			right: 16px;
			top: 50%;
			transform: translateY(-50%);
			background: none;
			border: none;
			outline: none;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #5f6368;
			font-size: 1.5rem;
			width: 32px;
			height: 32px;
			transition: background 0.2s;
			border-radius: 50%;
			color: var(--aero-omnibox-icon, #5f6368);
		}

		body.dark-theme .omnibox-clear-btn {
			color: #bdc1c6;
		}

		.omnibox-clear-btn:hover {
			background: var(--md-sys-color-surface-container-high);
		}
		.suggestions-container {
			display: flex;
			flex-direction: column;
			margin: 0;
			overflow: hidden;
			padding-bottom: 4px;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: #fff;
			border: var(--aero-suggestions-border-spec, 0);
			border-top: 1px solid var(--aero-hairline-color, #dfe1e5);
			padding-left: 1px;
			padding-right: 1px;
			border-radius: var(--aero-suggestions-radius, 0 0 24px 24px);
			box-shadow: 0 4px 6px rgba(32, 33, 36, .28);
			box-sizing: border-box;
			z-index: 1;
			max-height: 250px;
			overflow-y: auto;
			font-size: 1.25rem;
			font-family: "Google Sans", Arial, sans-serif;
			background-color: var(--aero-suggestions-bg, #fff);
			border: var(--aero-suggestions-border-spec, 0);
			border-radius: var(--aero-suggestions-radius, 0 0 24px 24px);
			box-shadow: var(--aero-suggestions-shadow, 0 4px 6px rgba(32, 33, 36, .28));
		}

		body.dark-theme .suggestions-container {
			/* Dark theme values will be set by CSS vars in theme.ts */
		}

		.suggestions-container::-webkit-scrollbar {
			width: 16px;
		}
		.suggestion-item {
			box-sizing: border-box;
			width: 100%;
			padding: 10px 15px;
			cursor: pointer;
			color: #202124;
			transition: background 0.2s;
			display: flex;
			align-items: center;
			color: var(--aero-suggestions-text, #202124);
		}

		body.dark-theme .suggestion-item {
			color: #e8eaed;
		}

		.suggestion-item:hover {
			background: #f1f3f4;
			background-color: var(--aero-suggestions-hover-bg, #f1f3f4);
		}

		body.dark-theme .suggestion-item:hover {
			background: var(--md-sys-color-surface-container-high);
		}
		.suggestion-icon {
			color: #5f6368;
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1.5rem;
			margin-right: 16px;
			color: var(--aero-suggestions-icon, #5f6368);
		}

		body.dark-theme .suggestion-icon {
			color: #bdc1c6;
		}
		.suggestion-text {
			flex-grow: 1;
		}
		.loading-indicator {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 16px;
		}

	`;

	return (
		<div>
			<div class="omnibox-container">
				<div class="omnibox-wrapper">
					<form
						class={use(this.showSuggestions, (show) =>
							show && this.suggestions.length > 0
								? "omnibox-box has-suggestions"
								: "omnibox-box",
						)}
						onSubmit={async (e: Event) => {
							e.preventDefault();
							await handleSubmit();
						}}
						autocomplete="off"
					>
						<span class="omnibox-icon">
							<md-icon>search</md-icon>
						</span>
						<input
							class="omnibox-input"
							type="search"
							placeholder="Search or enter URL"
							bind:value={use(omniboxStore.inputValue)}
							bind:this={use(this.inputElement)}
							on:keydown={async (e: KeyboardEvent) => {
								if (e.key === "Enter") {
									e.preventDefault();
									const currentValue = (e.target as HTMLInputElement).value;
									omniboxStore.inputValue = currentValue;
									await handleSubmit();
								}
							}}
							on:input={(e: Event) => {
								const value = (e.target as HTMLInputElement).value;
								clearTimeout(debounceTimeout);
								if (value?.trim()) {
									this.isLoadingSuggestions = true;
									this.showSuggestions = true;
									debounceTimeout = window.setTimeout(() => {
										fetchSuggestions(value);
									}, 300);
								} else {
									this.suggestions = [];
									this.showSuggestions = false;
									this.isLoadingSuggestions = false;
								}
							}}
							on:focus={() =>
								omniboxStore.inputValue?.trim() &&
								this.suggestions.length > 0 &&
								(this.showSuggestions = true)
							}
						/>
						{use(omniboxStore.inputValue, (v) =>
							v ? (
								// biome-ignore lint/a11y/useFocusableInteractive: <explanation>
								<div
									class="omnibox-clear-btn"
									aria-label="Clear search"
									// biome-ignore lint/a11y/useSemanticElements: <explanation>
									role="button"
									tabindex="0"
									on:click={clearInput}
								>
									<md-icon>close</md-icon>
								</div>
							) : null,
						)}
					</form>
					{use(this.showSuggestions, (show) =>
						show && this.suggestions.length > 0 ? (
							<div class="suggestions-container">
								{use(this.isLoadingSuggestions, (loading) =>
									loading && omniboxStore.inputValue?.trim() ? (
										<div class="loading-indicator">
											{/* biome-ignore lint/style/useSelfClosingElements: <explanation> */}
											<md-circular-progress
												indeterminate
											></md-circular-progress>
										</div>
									) : (
										use(this.suggestions, (sugs) =>
											sugs.map((suggestion) => (
												// biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
												<div
													class="suggestion-item"
													on:click={() => handleSuggestionClick(suggestion)}
												>
													<md-icon class="suggestion-icon">search</md-icon>
													<span class="suggestion-text">
														{suggestion.query}
													</span>
												</div>
											)),
										)
									),
								)}
							</div>
						) : null,
					)}
				</div>
			</div>
		</div>
	);
};

export default Omnibox;
