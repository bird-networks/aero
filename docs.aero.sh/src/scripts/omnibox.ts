import { initBareMux } from "./initBareMux";
import BareMux from "@mercuryworkshop/bare-mux";

const bareMux = new BareMux();

const BRAVE_SUGGEST_URL = "https://search.brave.com/api/suggest?q=";

async function fetchSuggestions(query: string): Promise<string[]> {
	if (!query) return []
	await initBareMux()
	try {
		const resp = await bareMux.fetch(`${BRAVE_SUGGEST_URL}${encodeURIComponent(query)}`)
		const data = await resp.json() as unknown[]
		if (Array.isArray(data) && Array.isArray(data[1])) {
			return (data[1] as string[]).slice(0, 5)
		}
	} catch {
		// ignore errors
	}
	return []
}

window.addEventListener("DOMContentLoaded", async () => {
	await initBareMux()
	const omnibox = document.getElementById("omnibox");
	const suggestionsBox = document.getElementById("suggestions");
	if (!(omnibox instanceof HTMLInputElement) || !(suggestionsBox instanceof HTMLDivElement)) return;

	omnibox.addEventListener("input", async () => {
		const query = omnibox.value.trim();
		const suggestions = await fetchSuggestions(query);
		suggestionsBox.innerHTML = "";
		suggestionsBox.hidden = suggestions.length === 0;
		for (const s of suggestions) {
			const item = document.createElement("div");
			item.textContent = s;
			item.className = "px-2 py-1 hover:bg-gray-200 cursor-pointer";
			item.addEventListener("click", () => {
				omnibox.value = s;
				suggestionsBox.hidden = true;
				const frame = document.getElementById("frame");
				if (frame instanceof HTMLIFrameElement) {
					frame.src = `https://search.brave.com/search?q=${encodeURIComponent(s)}`;
					frame.style.display = "block";
				}
			});
			suggestionsBox.appendChild(item);
		}
	});

	omnibox.addEventListener("keypress", (event) => {
		if (event.key !== "Enter") return;
		const raw = omnibox.value.trim();
		if (!raw) return;
		const url = raw.includes("://") ? raw : `https://${raw}`;
		suggestionsBox.hidden = true;
		const frame = document.getElementById("frame");
		if (frame instanceof HTMLIFrameElement) {
			frame.src = url;
			frame.style.display = "block";
		}
	});
});