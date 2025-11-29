import esbuild from "esbuild";
import inlineImport from "esbuild-plugin-inline-import";

await esbuild.build({
    entryPoints: ["src/index.ts"],
    platform: "node",
    bundle: true,
    sourcemap: true,
    outdir: "dist",
    plugins: [inlineImport()],
});
