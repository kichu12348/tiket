import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: ["react-spinners"],
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^react-spinners$/, replacement: "react-spinners/esm/index.js" },
    ],
  },
  plugins: [
    // viteTsConfigPaths({
    //   projects: ["./tsconfig.json"],
    // }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "app",
      router: {
        routesDirectory: "routes",
        generatedRouteTree: "routeTree.gen.ts",
      },
    }),
    viteReact(),
  ],
});
