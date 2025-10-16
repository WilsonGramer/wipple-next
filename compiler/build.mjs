import esbuild from "esbuild";

esbuild.build({
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.js",
    platform: "node",
    bundle: true,
    sourcemap: true,
});
