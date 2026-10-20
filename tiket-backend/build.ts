const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  minify: true,
  sourcemap: true,
  target: "bun",
});
if (!result.success) {
  for (const diagnostic of result.logs) console.error(diagnostic);
  process.exit(1);
}
