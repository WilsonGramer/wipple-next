import esbuild from "esbuild";

esbuild.build({
    entryPoints: ["src/index.ts", "src/**/*.test.ts", "tests/**/*.test.ts", "tests/**/*.wipple"],
    loader: { ".wipple": "copy" },
    outdir: "dist",
    platform: "node",
    bundle: true,
    sourcemap: true,
    external: ["mocha"],
});
