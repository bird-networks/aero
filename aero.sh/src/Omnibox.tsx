/// <reference types="dreamland" />

// Material Web Components
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/list/list.js";
import "@material/web/list/list-item.js";
import "@material/web/progress/circular-progress.js";

const BRAVE_SUGGEST_API = "https://search.brave.com/api/suggest";

interface Suggestion {
	query: string;
	type: string;
}

// Create a store for the omnibox input
const omniboxStore = $store(
	{ inputValue: "" },
	{ ident: "aero-omnibox-input", backing: "localstorage", autosave: "auto" },
);

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
			const response = await fetch(
				`${BRAVE_SUGGEST_API}?q=${encodeURIComponent(query)}&source=web`,
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
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
			this.showSuggestions = this.suggestions.length > 0;
			this.isLoadingSuggestions = false;
		} catch (error) {
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
		let urlToLoad = omniboxStore.inputValue.trim();

		if (!urlToLoad) return;

		// Clear the store after processing
		omniboxStore.inputValue = "";

		if (isValidURL(urlToLoad)) {
			this.iframeSrc = urlToLoad;
		} else if (urlToLoad.includes(".") && !urlToLoad.includes(" ")) {
			this.iframeSrc = `https://${urlToLoad}`;
		} else {
			this.iframeSrc = `https://search.brave.com/search?q=${encodeURIComponent(urlToLoad)}`;
		}
		this.showIframe = true;
		document.body.classList.add("iframe-active");
	};

	const handleSuggestionClick = (suggestion: Suggestion) => {
		omniboxStore.inputValue = suggestion.query; // Update store
		this.showSuggestions = false;
		handleSubmit(); // handleSubmit will now use the updated store value
	};

	const closeIframe = () => {
		this.showIframe = false;
		this.iframeSrc = null;
		omniboxStore.inputValue = ""; // Clear store
		this.showSuggestions = false;
		this.suggestions = [];
		this.isLoadingSuggestions = false;
		document.body.classList.remove("iframe-active");
	};

	// Handle Escape key to close suggestions or iframe
	this.mount = () => {
		// No need to sync this.inputValue as it's removed

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (this.showIframe) {
					closeIframe();
				} else if (this.showSuggestions) {
					this.showSuggestions = false;
				}
			}
		};
		document.addEventListener("keydown", handleKeydown);

		const handleClick = (e: MouseEvent) => {
			const dropdown = document.querySelector(".suggestions-container");
			
			const omniboxInputElement = document.querySelector(".omnibox-input");
			let clickedInsideOmniboxRelatedElements = false;
			if (omniboxInputElement && omniboxInputElement.contains(e.target as Node)) {
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

	this.css = `
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
    .omnibox-box {
      display: flex;
      align-items: center;
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 1px 6px 0 rgba(32,33,36,0.28);
      padding: 0 16px;
      margin: 0 auto;
      width: calc(100% - 40px);
      max-width: 600px;
      height: 48px;
      font-family: "Google Sans", Arial, sans-serif;
      position: relative;
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
      padding: 0 8px;
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
    }
    .omnibox-clear-btn:hover {
      background: #f1f3f4;
    }
    .suggestions-container {
      position: absolute;
      top: 56px;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 600px;
      background: #fff;
      border-radius: 0 0 24px 24px;
      box-shadow: 0 4px 16px rgba(32,33,36,0.28);
      z-index: 1001;
      max-height: 300px;
      overflow-y: auto;
      font-family: "Google Sans", Arial, sans-serif;
    }
    .suggestion-item {
      padding: 10px 24px;
      cursor: pointer;
      font-size: 1rem;
      color: #202124;
      transition: background 0.2s;
      display: flex;
      align-items: center;
    }
    .suggestion-item:hover {
      background: #f1f3f4;
    }
    .suggestion-icon {
      color: #5f6368;
      margin-right: 16px;
      font-size: 20px;
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
      z-index: 2000; /* Above everything */
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
			<form class="omnibox-box" onSubmit={(e: Event) => { e.preventDefault(); handleSubmit(); }} autocomplete="off">
				<span class="omnibox-icon">
					<md-icon>search</md-icon>
				</span>
				<input
					class="omnibox-input"
					type="search"
					placeholder="Search or enter URL"
					bind:value={use(omniboxStore.inputValue)}
					onKeyDown={(e: KeyboardEvent) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleSubmit();
						}
						clearTimeout(debounceTimeout);
						if (omniboxStore.inputValue.trim()) {
							this.isLoadingSuggestions = true;
							this.showSuggestions = true;
							debounceTimeout = window.setTimeout(() => {
								fetchSuggestions(omniboxStore.inputValue);
							}, 300);
						} else {
							this.suggestions = [];
							this.showSuggestions = false;
							this.isLoadingSuggestions = false;
						}
					}}
					onFocus={() => omniboxStore.inputValue.trim() && this.suggestions.length > 0 && (this.showSuggestions = true)}
				/>
				{use(omniboxStore.inputValue, (v) => v ? (
					<button
						type="button"
						class="omnibox-clear-btn"
						aria-label="Clear search"
						onClick={() => {
							console.log("[Omnibox] Clear button clicked");
							omniboxStore.inputValue = "";
							console.log("[Omnibox] store.inputValue after clear attempt:", omniboxStore.inputValue);
							this.suggestions = [];
							this.showSuggestions = false;
						}}
					>
						<md-icon>close</md-icon>
					</button>
				) : null)}
			</form>
			{use(this.showSuggestions, (show) => show && !this.showIframe && this.suggestions.length > 0 ? (
				<div class="suggestions-container">
					{use(this.isLoadingSuggestions, (loading) => loading && omniboxStore.inputValue.trim() ? (
						<div class="loading-indicator">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4285F4" stroke-width="4" stroke-dasharray="60" stroke-dashoffset="40"/></svg>
						</div>
					) : (
						use(this.suggestions, (sugs) => sugs.map((suggestion) => (
							<div class="suggestion-item" onClick={() => handleSuggestionClick(suggestion)}>
								<md-icon class="suggestion-icon">search</md-icon>
								<span class="suggestion-text">{suggestion.query}</span>
							</div>
						)))
					))}
				</div>
			) : null)}
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
