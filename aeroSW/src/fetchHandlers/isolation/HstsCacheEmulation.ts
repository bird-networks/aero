/**
 * @module
 * This module is responsible for emulating HSTS cache behavior using emulation and IndexedDB
 *
 * @example
 */

import { errAsync as nErrAsync, okAsync, ResultAsync } from "neverthrow";
import { fmtNeverthrowErr } from "$shared/fmtErr";
import type { Nullable } from "option-t/nullable";

import Cache from "./Cache";

// Error strings
const unexpectedPromiseResRetErrorExplanation =
	' Something other than "success" or Error was returned.';
const processHSTSAction = "process the HTTP header for HSTS";

// TODO: Put the internal-use (recommended?) methods on the bottom
/**
 * Class for emulating HSTS cache behavior using IndexedDB.
 *
 * @extends {Cache}
 *
 * @example
 * ...
 * const hstsCacheEmulator = new HSTSCacheEmulation(
 *  rewrittenReqHeaders.get("strict-transport-security"),
  proxyUrl.origin
 * );
 */
export default class HSTSCacheEmulation extends Cache {
	/**
	 * The hostname of the proxy server.
	 *
	 * @member
	 */
	proxyHostname: string;

	/**
	 * Constructs a new HSTSCacheEmulation instance.
	 *
	 * @param hsts The HSTS header value
	 * @param proxyHostname The hostname of the proxy server
	 */
	constructor(hsts: string, proxyHostname: string) {
		super();
		this.proxyHostname = proxyHostname;

		if (hsts) {
			this.processHSTS(hsts);
		}
	}

	/**
	 * Processes the HSTS header and stores the relevant information in IndexedDB
	 * @param hsts - The HSTS header value
	 * @returns
	 *
	 * @example
	 * TODO:...
	 */
	async processHSTS(hsts: string): Promise<ResultAsync<void, Error>> {
		let directives: readonly string[];
		try {
			directives = hsts.toLowerCase().split(";");
		} catch (err) {
			return nErrAsync(
				new Error(
					`${failedToFormVar("directives", "string array")
					} ${processHSTSAction}: ${err instanceof Error ? err.message : String(err)}`,
				),
			);
		}

		let includeSubdomains: boolean;
		try {
			const includeSubdomainsDirective = directives.find(
				(dir) => dir === "includeSubdomain",
			);
			includeSubdomains = includeSubdomainsDirective !== undefined;
		} catch (err) {
			return fmtNeverthrowErr(
				`${failedToFormVar("includeSubdomains", "boolean")
				} ${processHSTSAction}`,
				err instanceof Error ? err : new Error(String(err)),
			);
		}

		let maxAge: string;
		try {
			const maxAgeDirective = directives.find((dir) =>
				dir.startsWith("max-age")
			);
			if (typeof maxAgeDirective === "undefined") {
				// There is no need to do anything if there is no max-age directive
				return okAsync(undefined);
			}
			maxAge = maxAgeDirective?.split("=")?.[1];
		} catch (err) {
			return fmtNeverthrowErr(
				`Failed to get the max-age directive when trying to ${processHSTSAction}`,
				err instanceof Error ? err : new Error(String(err)),
			);
		}

		if (maxAge === "0") {
			const deleteEntryRes = await this.deleteEntry();
			if (deleteEntryRes.isErr()) {
				return fmtNeverthrowErr(
					`Failed to delete the entry when trying to ${processHSTSAction}`,
					deleteEntryRes.error,
				);
			}
		} else if (maxAge) {
			const storeEntryRes = await this.storeEntry(maxAge, includeSubdomains);
			if (storeEntryRes.isErr()) {
				return fmtNeverthrowErr(
					`Failed to store the entry when trying to ${processHSTSAction}`,
					storeEntryRes.error,
				);
			}
		}

		return okAsync(undefined);
	}

	/**
	 * Redirects to HTTPS if an HSTS entry exists for the given hostname or its subdomains.
	 *
	 * @returns - Whether a redirect should be performed.
	 *
	 * @example
	 * const redirectRes = await hstsCacheEmulator.redirect();
	 * if (redirectRes.isErr()) {
	 *  const redirectResErr = new Error(`Failed to determine if the client should redirect when using the cache emulator${ERR_LOG_AFTER_COLON}${redirectRes.error.message}`)
	 *  ...(handle the error accordingly)
	 * } else {
	 * ...(your logic to redirect to the HTTPS version of your proxy URL)
	 * }
	 */
	async redirect(): Promise<ResultAsync<boolean, Error>> {
		try {
			const domains = this.proxyHostname.split(".");
			for (let i = domains.length - 1; i >= 1; i--) {
				const domain = domains.slice(i).join(".");
				const secRes = await this.getEntry(domain);
				if (secRes.isErr()) {
					return nErrAsync(
						new Error(
							`Failed to get the entry for the domain, ${domain}, while trying to determine if the redirect to HTTPS should be done: ${secRes.error.message}`,
						),
					);
				}
				// TODO: Use Zod instead and have getEntry fail if it isn't validated properly instead of having to check externally like here for Runtime type checking for `secRes.value.result...` (validation)
				if (typeof secRes.value?.subdomains === "undefined") {
					return nErrAsync(
						new Error(
							`The entry for the domain, ${domain}, does not have the subdomains field defined`,
						),
					);
				}
				if (typeof secRes.value?.age === "undefined") {
					return nErrAsync(
						new Error(
							`The entry for the domain, ${domain}, does not have the age field defined`,
						),
					);
				}
				if (
					typeof secRes.value.subdomains === "boolean" &&
					secRes.value.subdomains === true
				) {
					return okAsync(
						secRes.value.subdomains &&
						super.isFresh(secRes.value.age),
					);
				}
			}
			const sec = await this.getEntry(this.proxyHostname);
			if (sec.isErr()) {
				return nErrAsync(sec.error);
			}
			return okAsync(sec.value?.age ? super.isFresh(sec.value.age) : false);
		} catch (err) {
			// @ts-ignore
			return fmtNeverthrowErr(
				`Failed to determine if the redirect to HTTPS should be done${ERR_LOG_AFTER_COLON}${err}`,
			);
		}
	}

	/**
	 * Deletes the HSTS entry for the given hostname.
	 * This is meant to be for internal use only, but it is exposed just in case you want to use it for whatever reason.
	 *
	 * @returns
	 *
	 * @example
	 * await this.deleteEntry();
	 */
	async deleteEntry(): Promise<ResultAsync<void, Error>> {
		// FIXME: THIS IS WRITTEN WRONG
		const deleteRes = await new Promise<"success" | Error>(
			(resolve, reject) => {
				const idbReq = indexedDB.deleteDatabase(this.proxyHostname);
				idbReq.onsuccess = (): void => resolve("success");
				idbReq.onerror = (): void => reject(idbReq.error);
			},
		);
		if (deleteRes instanceof Error) {
			return nErrAsync(
				new Error(
					`Failed to delete the HSTS entry ${this.proxyHostname}${ERR_LOG_AFTER_COLON}${deleteRes.message} `,
				),
			);
		}
		if (deleteRes === "success") {
			return okAsync(undefined);
		}
		return nErrAsync(
			new Error(
				`Failed to determine if the attempt to delete the HSTS entry was successful${ERR_LOG_AFTER_COLON}${unexpectedPromiseResRetErrorExplanation}`,
			),
		);
	}

	/**
	 * Stores an HSTS entry in IndexedDB.
	 * This is meant to be for internal use only, but it is exposed just in case you want to use it for whatever reason.
	 *
	 * @param age The max-age value of the HSTS header.
	 * @param includeSubdomains Whether the HSTS header includes subdomains.
	 * @returns
	 *
	 * @example
	 * // See the processHSTS method for an example of how to use this method. It reveals how I define the maxAge and includeSubdomains variables.
	 * await this.storeEntry(maxAge, includeSubdomains);
	 */
	async storeEntry(
		age: string,
		includeSubdomains: boolean,
	): Promise<ResultAsync<void, Error>> {
		const dbRes = await HSTSCacheEmulation.safeOpenDatabase();
		if (dbRes.isErr()) {
			return nErrAsync(
				new Error(
					`Failed to open the IndexedDB database used for storing the HSTS entry${ERR_LOG_AFTER_COLON}${dbRes.error.message}`,
				),
			);
		}
		const db = dbRes.value;

		let tx: IDBTransaction;
		let store: IDBObjectStore;
		try {
			tx = db.transaction(this.proxyHostname, "readwrite");
			store = tx.objectStore(this.proxyHostname);
		} catch (err) {
			// @ts-ignore
			return fmtNeverthrowErr(
				`Failed to get the store for the HSTS entry${ERR_LOG_AFTER_COLON}${err}`,
			);
		}

		const idbReqPromise = await new Promise<"success" | Error>(
			(reject, resolve) => {
				const idbReq = store.put({
					age: age,
					subdomains: includeSubdomains,
				});
				idbReq.onsuccess = (): void => resolve("success");
				idbReq.onerror = (): void => reject(idbReq.error || new Error("IndexedDB operation failed"));
			},
		);
		if (idbReqPromise instanceof Error) {
			return nErrAsync(
				new Error(
					`Failed to store the HSTS entry${ERR_LOG_AFTER_COLON}${idbReqPromise.message} `,
				),
			);
		}

		const firstPromise = await Promise.race([
			new Promise<"success" | Error>((reject, resolve) => {
				tx.oncomplete = (): void => {
					db.close();
					resolve("success");
				};
				tx.onerror = (): void => reject(tx.error || new Error("Transaction failed"));
			}),
			new Promise<{
				type: "timeout";
			}>((reject) => {
				setTimeout(() =>
					reject({
						type: "timeout",
					}), aeroConfig.dbTransactionTimeout);
			}),
		]);
		// Check if the promise returned a timeout object
		if (typeof firstPromise === "object" && firstPromise !== null && "type" in firstPromise && firstPromise.type === "timeout") {
			return nErrAsync(
				new Error(
					"The transaction used for storing the HSTS entry unexpectedly timed out!",
				),
			);
		}
		if (firstPromise instanceof Error) {
			// @ts-ignore
			return fmtNeverthrowErr(
				`Failed to close the transaction used for storing the HSTS entry${ERR_LOG_AFTER_COLON}${firstPromise}`,
			);
		}
		if (firstPromise === "success") {
			return okAsync(undefined);
		}
		return nErrAsync(
			new Error(
				`Failed to determine if the attempt to store the HSTS entry was successful${ERR_LOG_AFTER_COLON}${unexpectedPromiseResRetErrorExplanation}!`,
			),
		);
	}

	/**
	 * Retrieves an HSTS entry from IndexedDB.
	 *
	 * @param hostname - The hostname to retrieve the entry for.
	 * @returns The emulated HSTS entry from the store
	 */
	async getEntry(
		hostname: string,
	): Promise<ResultAsync<Nullable<{ subdomains: boolean; age: number }>, Error>> {
		try {
			const dbRes = await HSTSCacheEmulation.safeOpenDatabase();
			if (dbRes.isErr()) {
				return nErrAsync(dbRes.error);
			}
			const db = dbRes.value;
			const tx = db.transaction(hostname, "readwrite");
			const store = tx.objectStore(hostname);
			const request = store.get(hostname);

			// Wait for the request to complete
			const result = await new Promise<any>((resolve, reject) => {
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});

			return okAsync(result);
		} catch (err) {
			return fmtNeverthrowErr(
				`Failed to get the HSTS entry for the hostname, ${hostname}`,
				err instanceof Error ? err : new Error(String(err)),
			);
		}
	}

	static async clear(proxyOrigin: string): Promise<ResultAsync<void, Error>> {
		const dbRes = await this.safeOpenDatabase();
		if (dbRes.isErr()) {
			return nErrAsync(
				new Error(
					`Failed to open the IndexedDB database used for clearing the HSTS entry${ERR_LOG_AFTER_COLON}${dbRes.error.message} `,
				),
			);
		}
		const db = dbRes.value;

		const tx = db.transaction(proxyOrigin, "readwrite");
		const store = tx.objectStore(proxyOrigin);
		const clearRes = await new Promise<"success" | Error>((resolve, reject) => {
			const clearReq = store.clear();
			clearReq.onsuccess = (): void => resolve("success");
			clearReq.onerror = (): void => reject(clearReq.error);
		});
		if (clearRes instanceof Error) {
			return fmtNeverthrowErr(
				`Failed to clear the HSTS entry${ERR_LOG_AFTER_COLON}${clearRes}`,
				clearRes,
			);
		}

		return okAsync(undefined);
	}

	/**
	 * A safe and modernized abstraction for opening the IndexedDB database we need for HSTSCacheEmulation.
	 * This is a helper function meant to be for internal-use only, but it is exposed just in case you want to use it for whatever reason.
	 *
	 * @returns The IndexedDB database
	 *
	 * @example
	 * const dbRes = await this.safeOpenDatabase();
	 * if (dbRes.isErr())
	 *   ...(abort)
	 * const db = dbRes.value;
	 */
	static async safeOpenDatabase(): Promise<ResultAsync<IDBDatabase, Error>> {
		try {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open("sts");
				req.onsuccess = (): void => resolve(req.result);
				req.onerror = (): void => reject(req.error);
			});
			return okAsync(db);
		} catch (err) {
			// @ts-ignore
			return fmtNeverthrowErr("Failed to open the IndexedDB database", err);
		}
	}
}

// Error string templates
// TODO: Make a separate module for these
function failedToFormVar(variableName: string, variableType: string): string {
	return failedToGeneric("create/form", variableName, variableType);
}
function failedToDeleteVar(variableName: string): string {
	return failedToGeneric("delete", variableName);
}
function failedToGeneric(
	action: string,
	variableName: string,
	variableType?: string,
): string {
	return `Failed to ${action} the ${variableName} variable ${variableType ? `(${variableType}) ` : ""
		}when trying to`;
}
