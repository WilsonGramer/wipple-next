import { test } from "mocha";
import { parsePattern, testParse } from ".";

test("parsing wildcard pattern", () => {
    testParse(parsePattern, "_", {
        type: "wildcard",
    });
});

test("parsing variable pattern", () => {
    testParse(parsePattern, "x", {
        type: "variable",
        variable: { value: "x" },
    });
});

test("parsing structure pattern", () => {
    testParse(parsePattern, "Foo {x : y}", {
        type: "structure",
        name: { value: "Foo" },
        fields: [
            {
                name: { value: "x" },
                value: {
                    type: "variable",
                    variable: { value: "y" },
                },
            },
        ],
    });
});

test("parsing set pattern", () => {
    testParse(parsePattern, "set x", {
        type: "set",
        variable: { value: "x" },
    });
});

test("parsing simple constructor pattern", () => {
    testParse(parsePattern, "None", {
        type: "constructor",
        constructor: { value: "None" },
        elements: [],
    });
});

test("parsing complex constructor pattern", () => {
    testParse(parsePattern, "Some x y z", {
        type: "constructor",
        constructor: { value: "Some" },
        elements: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
            { type: "variable", variable: { value: "z" } },
        ],
    });
});

test("parsing simple or pattern", () => {
    testParse(parsePattern, "x or y", {
        type: "or",
        patterns: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
    });
});

test("parsing complex or pattern", () => {
    testParse(parsePattern, "x or y or z", {
        type: "or",
        patterns: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
            { type: "variable", variable: { value: "z" } },
        ],
    });
});
