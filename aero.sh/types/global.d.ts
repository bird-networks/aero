import type { BareMux, BareMuxConnection } from "@mercuryworkshop/bare-mux";
import type { AeroConfig } from "../../aeroSW/types/config.js";

declare global {
	interface Window {
		aeroConfig?: AeroConfig;
		defaultAeroConfig?: AeroConfig;
		BareMuxConnection?: BareMuxConnection;
		BareMux: BareMux;
	}
}

// biome-ignore lint/complexity/noUselessEmptyExport: <explanation>
export {};
