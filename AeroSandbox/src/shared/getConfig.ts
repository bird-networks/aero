import getPropFromTree from "./getPropFromTree";
import type { Config } from "$types/config";

/** Returns the proxy namespace config at build time */
export function getProxyConfig(): Config {
	return getPropFromTree<Config>(`${PROXY_NAMESPACE}.${CONFIG_KEY}`)!;
}

/** Get the runtime Config for AeroSandbox */
export default function getConfig(): Config {
	return getPropFromTree<Config>(`${PROXY_NAMESPACE}.${OUR_NAMESPACE}.${CONFIG_KEY}`)!;
}
