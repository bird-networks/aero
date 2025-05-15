/**
 * Retrieves a nested property from the global namespace using a dot-separated path
 * @template T
 * @param propTree - dot-separated path to the property
 * @returns The property value or undefined if not found
 */
export default function getPropFromTree<T = unknown>(propTree: string): T | undefined {
	return propTree.split('.')
		.reduce((obj: any, key) => (obj != null ? obj[key] : undefined), globalThis as any) as T | undefined
}

/**
 * Retrieves a property from the proxy namespace
 * @template T
 * @param propTree - dot-separated path to the property
 * @returns The property value or undefined if not found
 */
export function getPropOnProxyNamespace<T = unknown>(propTree: string): T | undefined {
	return getPropFromTree<T>(`${PROXY_NAMESPACE}.${propTree}`);
}

/**
 * Retrieves a property from the AeroSandbox namespace
 * @template T
 * @param propTree - dot-separated path to the property
 * @returns The property value or undefined if not found
 */
export function getPropOnAeroSandboxNamespace<T = unknown>(propTree: string): T | undefined {
	return getPropFromTree<T>(`${OUR_NAMESPACE}.${propTree}`);
}
