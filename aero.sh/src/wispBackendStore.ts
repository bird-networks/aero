/**
 * Store for wisp backend configuration settings
 * Allows users to customize the wisp URL used for BareMux transport
 */

/** Default wisp URL based on current location */
const getDefaultWispUrl = (): string => {
	return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
};

/** Store for wisp backend settings */
export const wispBackendStore = $store(
	{
		/** Custom wisp URL - if empty, uses default */
		customWispUrl: "",
		/** Whether to use custom URL or default */
		useCustomUrl: false,
	},
	{
		ident: "aero-wisp-backend-settings",
		backing: "localstorage",
		autosave: "auto",
	},
);

/** Get the current wisp URL to use (custom or default) */
export const getCurrentWispUrl = (): string => {
	if (wispBackendStore.useCustomUrl && wispBackendStore.customWispUrl.trim()) {
		return wispBackendStore.customWispUrl.trim();
	}
	return getDefaultWispUrl();
};

/** Get the default wisp URL for display purposes */
export const getDefaultWispUrlForDisplay = (): string => {
	return getDefaultWispUrl();
};
