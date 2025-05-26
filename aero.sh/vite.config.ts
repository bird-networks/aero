import { defineConfig } from "vite";
import { dreamlandPlugin } from "vite-plugin-dreamland";

export default defineConfig({
	server: {
		port: 2525,
	},
	plugins: [dreamlandPlugin()],
});
