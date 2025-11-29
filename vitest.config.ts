import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: ["compiler", "tests"],
        coverage: {
            provider: "v8",
            include: ["compiler/src/**/*.ts"],
            reportsDirectory: ".coverage",
            reporter: [...coverageConfigDefaults.reporter, "html"],
        },
    },
});
