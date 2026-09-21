Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  minify: true,
  sourcemap: true,
  target: "bun",
});
