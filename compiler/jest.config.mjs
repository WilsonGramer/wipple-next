/** @type {import("jest").Config} **/
export default {
    testEnvironment: "node",
    testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                diagnostics: {
                    warnOnly: true,
                    ignoreCodes: ["TS151001"],
                },
            },
        ],
    },
};
