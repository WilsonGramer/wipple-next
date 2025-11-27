import esbuild from "esbuild";
import inlineImport from "esbuild-plugin-inline-import";

esbuild.build({
    entryPoints: ["src/index.ts"],
    outdir: "dist",
    platform: "node",
    bundle: true,
    sourcemap: true,
    plugins: [inlineImport()],
});
