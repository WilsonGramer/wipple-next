import esbuild from "esbuild";
import inlineImport from "esbuild-plugin-inline-import";

esbuild.build({
    entryPoints: ["src/index.ts"],
    loader: { ".wipple": "copy" },
    outfile: "dist/index.js",
    platform: "node",
    bundle: true,
    sourcemap: true,
    plugins: [inlineImport()],
});
