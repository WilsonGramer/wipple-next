import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
    globalIgnores(["dist/"]),
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },
    {
        rules: {
            "prefer-const": ["error", { destructuring: "all" }],
            "no-empty-pattern": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    disallowTypeAnnotations: false,
                },
            ],
        },
    },
    {
        files: ["src/*/**/*.ts"],
        rules: {
            "no-console": "warn",
        },
    },
    {
        files: ["**/*.test.ts"],
        rules: {
            "@typescript-eslint/no-floating-promises": "off",
        },
    },
]);
