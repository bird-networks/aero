/// <reference types="dreamland" />

/**
 * @module searchEngineStore
 * Manages search engine preferences and configurations using Dreamland stores
 */

/** Search engine configuration */
export interface SearchEngine {
	/** Unique identifier for the search engine */
	id: string;
	/** Display name of the search engine */
	name: string;
	/** 
	   * Builds the suggestion API URL
	   * @param query The search query
	   * @returns The suggestion API URL string
	   */
	suggestUrlBuilder: (query: string) => string;
	/** 
	   * Builds the search results page URL
	   * @param query The search query
	   * @returns The search results page URL string
	   */
	searchUrlBuilder: (query: string) => string;
	/** 
	   * Parses the suggestion API response
	   * @param data The raw data from the suggestion API
	   * @returns An array of suggestion strings
	   */
	suggestionParser: (data: any) => string[];
}

/** Available search engines */
export const AVAILABLE_SEARCH_ENGINES: readonly SearchEngine[] = [
	{
		id: "google",
		name: "Google",
		suggestUrlBuilder: (query) =>
			`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
		searchUrlBuilder: (query) =>
			`https://www.google.com/search?q=${encodeURIComponent(query)}`,
		suggestionParser: (data) => {
			if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
				return data[1].map((item: any) => String(item)).filter(Boolean);
			}
			return [];
		}
	},
	{
		id: "brave",
		name: "Brave Search",
		suggestUrlBuilder: (query) =>
			`https://search.brave.com/api/suggest?q=${encodeURIComponent(query)}&source=web`,
		searchUrlBuilder: (query) =>
			`https://search.brave.com/search?q=${encodeURIComponent(query)}`,
		suggestionParser: (data) => {
			// Google format
			if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				return data[1].map((item: any) => String(item)).filter(Boolean);
			}
			// Brave Format
			if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
				return data.map((item: string) => String(item)).filter(Boolean);
			}
			return [];
		}
	}
] as const;

/** Dreamland store for search engine settings */
export const searchEngineStore = $store(
	{
		/** The ID of the currently selected search engine */
		currentEngineId: AVAILABLE_SEARCH_ENGINES[0].id,
	},
	{
		ident: "aero-search-engine-settings",
		backing: "localstorage",
		autosave: "auto",
	}
);

/**
 * Gets the configuration for the current search engine
 * @returns The configuration for the current search engine
 */
export function getCurrentSearchEngine(): SearchEngine {
	return AVAILABLE_SEARCH_ENGINES.find(engine => engine.id === searchEngineStore.currentEngineId) || AVAILABLE_SEARCH_ENGINES[0];
} 