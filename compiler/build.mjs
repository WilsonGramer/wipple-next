import esbuild from "esbuild";
import inlineImport from "esbuild-plugin-inline-import";

esbuild.build({
    entryPoints: ["src/index.ts", "src/**/*.test.ts", "tests/**/*.test.ts", "tests/**/*.wipple"],
    loader: { ".wipple": "copy" },
    outdir: "dist",
    platform: "node",
    bundle: true,
    sourcemap: true,
    external: ["mocha"],
    plugins: [inlineImport()],
});
