// @ts-check
import fs from "fs-extra";
import path from "node:path";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import sirv from "sirv";

// Interface for the final internal copy operations
/** @internal */
interface InternalCopyOperation {
  /** The absolute source path of the file/directory to copy */
  src: string;
  /** The absolute destination path for the file/directory */
  dest: string;
}

// Configuration interface for each target
/** Configuration for each copy and serve target */
export interface CopyTarget {
  /** Absolute path to the source directory */
  src: string;
  /** URL prefix for dev server (e.g., `"/aero/sandbox"`) */
  serveAt?: string;
}

/**
 * A custom Vite plugin for copying build files and serving them during development
 * This is required because the `vite-plugin-static-copy` doesn't currently work with Starlight
 * @param targets - Where to copy the files to and where to serve them from
 * @returns The custom Vite plugin
 */
export function customCopyPlugin(targets: CopyTarget[]): Plugin {
  let outDir = "dist";
  let clientOutDirRoot = "dist";
  let serverOutDirRoot = "dist/server";

  return {
    name: "custom-fs-extra-copy",
    configResolved(resolvedConfig: ResolvedConfig) {
      outDir = resolvedConfig.build.outDir;
      clientOutDirRoot = outDir;
      serverOutDirRoot = path.resolve(outDir, "server");
    },
    configureServer(server: ViteDevServer) {
      for (const target of targets) {
        if (target.src && target.serveAt) {
          if (fs.existsSync(target.src)) {
            server.middlewares.use(
              target.serveAt,
              sirv(target.src, {
                dev: true,
                dotfiles: false,
                single: false,
              }),
            );
            console.log(
              `Custom copy (dev): Serving ${target.src} at ${target.serveAt}`,
            );
          } else {
            console.warn(
              `Custom copy (dev): Source directory ${target.src} for ${target.serveAt} not found. Skipping dev server setup.`,
            );
          }
        }
      }
    },
    async writeBundle() {
      const finalCopyOps: InternalCopyOperation[] = [];
      for (const target of targets) {
        // Derive build destination subdirectories from serveAt if it exists
        let destSubDir: string | undefined = undefined;
        if (target.src && target.serveAt) {
          destSubDir = target.serveAt.startsWith("/")
            ? target.serveAt.substring(1)
            : target.serveAt;
          if (destSubDir && !destSubDir.endsWith("/")) {
            destSubDir += "/";
          }
        }

        if (target.src && destSubDir) {
          // Client-side copy
          finalCopyOps.push({
            src: target.src,
            dest: path.resolve(clientOutDirRoot, destSubDir),
          });
          // Server-side copy
          finalCopyOps.push({
            src: target.src,
            dest: path.resolve(serverOutDirRoot, destSubDir),
          });
        }
      }

      for (const op of finalCopyOps) {
        try {
          await fs.ensureDir(op.dest);
          await fs.copy(op.src, op.dest, {
            overwrite: true,
          });
          console.log(
            `Custom copy (build): Copied from ${op.src} to ${op.dest}`,
          );
        } catch (err) {
          console.warn(
            `Custom copy (build): Failed to copy from ${op.src} to ${op.dest}:`,
            err,
          );
        }
      }
    },
  };
}
