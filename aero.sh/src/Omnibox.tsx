/// <reference types="dreamland" />

// Material Web Components
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/list/list.js";
import "@material/web/list/list-item.js";
import "@material/web/progress/circular-progress.js";

const BRAVE_SUGGEST_API = "https://search.brave.com/api/suggest";
const SEARCH_API = "https://www.google.com/search?q=";

interface Suggestion {
	query: string;
	type: string;
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

const Omnibox: Component<
	{},
	{
		/** Suggestions for the omnibox */
		suggestions: Suggestion[];
		/** Whether suggestions are loading */
		isLoadingSuggestions: boolean;
		/** Whether to show suggestions dropdown */
		showSuggestions: boolean;
		/** Iframe source URL */
		iframeSrc: string | null;
		/** Whether to show the iframe */
		showIframe: boolean;
		/** Reference to the input element */
		inputElement: HTMLInputElement;
	}
> = function () {
	this.suggestions = [];
	this.isLoadingSuggestions = false;
	this.showSuggestions = false;
	this.iframeSrc = null;
	this.showIframe = false;

	let debounceTimeout: number | undefined;

	const fetchSuggestions = async (query: string) => {
		if (!query.trim()) {
			this.suggestions = [];
			this.showSuggestions = false;
			return;
		}
		this.isLoadingSuggestions = true;
		try {
			console.debug("[Suggestions] Fetching for:", query);
			const response = await fetch(
				`${BRAVE_SUGGEST_API}?q=${encodeURIComponent(query)}&source=web`,
			);
			if (!response.ok) {
				throw new Error(`Failed to get search suggestions (status ${response.status})`);
			}
			const data = await response.json();
			console.debug("[Suggestions] API response:", data);
			
			if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
				this.suggestions = data[1]
					.map((item: any) => {
						if (typeof item === "string") return { query: item, type: "query" };
						if (
							Array.isArray(item) &&
							item.length > 0 &&
							typeof item[0] === "string"
						)
							return { query: item[0], type: "query" };
						return { query: String(item), type: "unknown" };
					})
					.filter((s) => s.query && s.query.trim() !== "");
			} else if (
				Array.isArray(data) &&
				data.length > 0 &&
				typeof data[0] === "string"
			) {
				this.suggestions = data.map((item: string) => ({
					query: item,
					type: "query",
				}));
			} else {
				this.suggestions = [];
			}
			
			console.debug("[Suggestions] Processed suggestions:", this.suggestions);
			console.debug("[Suggestions] Will show dropdown:", this.suggestions.length > 0);
			this.showSuggestions = this.suggestions.length > 0;
			this.isLoadingSuggestions = false;
		} catch (error) {
			console.error("[Suggestions] Error fetching:", error);
			this.suggestions = [];
			this.showSuggestions = false;
			this.isLoadingSuggestions = false;
		}
	};

	const isValidURL = (string: string): boolean => {
		try {
			new URL(string);
			return true;
		} catch (_) {
			return false;
		}
	};

	const handleSubmit = () => {
		this.showSuggestions = false;
		let urlToLoad = omniboxStore.inputValue?.trim() || "";

		if (!urlToLoad) return;

		// Clear store after processing
		omniboxStore.inputValue = "";

		if (isValidURL(urlToLoad)) {
			this.iframeSrc = urlToLoad;
		} else if (urlToLoad.includes(".") && !urlToLoad.includes(" ")) {
			this.iframeSrc = `https://${urlToLoad}`;
		} else {
			this.iframeSrc = `${SEARCH_API}=${encodeURIComponent(urlToLoad)}`;
		}
		this.showIframe = true;
		document.body.classList.add("iframe-active");
	};

	const handleSuggestionClick = (suggestion: Suggestion) => {
		omniboxStore.inputValue = suggestion.query; // Update store
		this.showSuggestions = false;
		handleSubmit(); // handleSubmit will now use the updated store value
	};

	const clearInput = () => {
		// Clear the store
		omniboxStore.inputValue = "";
		
		// Also directly clear the DOM input to ensure it updates
		if (this.inputElement) {
			this.inputElement.value = "";
			
			// Trigger input and change events to ensure reactivity
			this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
			this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
			
			this.inputElement.focus();
		}
		
		this.suggestions = [];
		this.showSuggestions = false;
		this.isLoadingSuggestions = false;
	};

	const closeIframe = () => {
		this.showIframe = false;
		this.iframeSrc = null;
		clearInput();
		document.body.classList.remove("iframe-active");
	};

	// Monitor store changes and clear suggestions when empty
	useChange(omniboxStore.inputValue, () => {
		// Clear suggestions when input is empty
		if (!omniboxStore.inputValue?.trim()) {
			this.suggestions = [];
			this.showSuggestions = false;
			this.isLoadingSuggestions = false;
		}
	});

	// Handle Escape key to close suggestions or iframe
	this.mount = () => {

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (this.showIframe) {
					closeIframe();
				} else if (this.showSuggestions) {
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

	this.css = /* css */`
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
      background: #f1f3f4;
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
      /* background: var(--aero-suggestions-bg, #303134); */
      /* border-color: var(--aero-suggestions-border, #303134); */
      /* box-shadow: var(--aero-suggestions-shadow, ...); */
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
      background: #3c4043;
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
    .iframe-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: var(--md-sys-color-surface, #fff);
      z-index: 2000;
      display: flex;
      flex-direction: column;
    }
    .iframe-controls {
      display: flex;
      justify-content: flex-end;
      padding: 8px;
      background-color: var(--md-sys-color-surface-container-low, #eee);
    }
    .iframe-controls md-icon-button {
      --md-icon-button-icon-color: var(--md-sys-color-on-surface-variant);
    }
    .iframe-element {
        flex-grow: 1;
        border: none;
    }
    body.iframe-active > *:not(.iframe-container) {
        display: none !important;
    }
  `;

	return (
		<div class="omnibox-container">
			<div class="omnibox-wrapper">
				<form class={use(this.showSuggestions, (show) => show && !this.showIframe && this.suggestions.length > 0 ? "omnibox-box has-suggestions" : "omnibox-box")} onSubmit={(e: Event) => { e.preventDefault(); handleSubmit(); }} autocomplete="off">
					<span class="omnibox-icon">
						<md-icon>search</md-icon>
					</span>
					<input
						class="omnibox-input"
						type="search"
						placeholder="Search or enter URL"
						bind:value={use(omniboxStore.inputValue)}
						bind:this={use(this.inputElement)}
						on:keydown={(e: KeyboardEvent) => {
							if (e.key === "Enter") {
								e.preventDefault();
								const currentValue = (e.target as HTMLInputElement).value;
								// Update store with current input value before submitting
								omniboxStore.inputValue = currentValue;
								handleSubmit();
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
						on:focus={() => omniboxStore.inputValue?.trim() && this.suggestions.length > 0 && (this.showSuggestions = true)}
					/>
					{use(omniboxStore.inputValue, (v) => v ? (
						<div
							class="omnibox-clear-btn"
							aria-label="Clear search"
							role="button"
							tabindex="0"
							on:click={clearInput}
						>
							<md-icon>close</md-icon>
						</div>
					) : null)}
				</form>
				{use(this.showSuggestions, (show) => show && !this.showIframe && this.suggestions.length > 0 ? (
					<div class="suggestions-container">
						{use(this.isLoadingSuggestions, (loading) => loading && omniboxStore.inputValue?.trim() ? (
							<div class="loading-indicator">
								<md-circular-progress indeterminate></md-circular-progress>
							</div>
						) : (
							use(this.suggestions, (sugs) => sugs.map((suggestion) => (
								<div class="suggestion-item" on:click={() => handleSuggestionClick(suggestion)}>
									<md-icon class="suggestion-icon">search</md-icon>
									<span class="suggestion-text">{suggestion.query}</span>
								</div>
							)))
						))}
					</div>
				) : null)}
			</div>
			{use(this.showIframe, (show) => show && this.iframeSrc ? (
				<div class="iframe-container">
					<div class="iframe-controls">
						<md-icon-button on:click={closeIframe} aria-label="Close view">
							<md-icon>close</md-icon>
						</md-icon-button>
					</div>
					<iframe class="iframe-element" src={this.iframeSrc}></iframe>
				</div>
			) : null)}
		</div>
	);
};

export default Omnibox;
