import test from "node:test";
import { testParse } from ".";

test("wildcard pattern", () => {
    testParse("pattern", "_", {
        type: "wildcard",
    });
});

test("variable pattern", () => {
    testParse("pattern", "x", {
        type: "variable",
        variable: { value: "x" },
    });
});

test("structure pattern", () => {
    testParse("pattern", "Foo {x : y}", {
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

test("set pattern", () => {
    testParse("pattern", "set x", {
        type: "set",
        variable: { value: "x" },
    });
});

test("simple constructor pattern", () => {
    testParse("pattern", "None", {
        type: "constructor",
        constructor: { value: "None" },
        elements: [],
    });
});

test("complex constructor pattern", () => {
    testParse("pattern", "Some x y z", {
        type: "constructor",
        constructor: { value: "Some" },
        elements: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
            { type: "variable", variable: { value: "z" } },
        ],
    });
});

test("simple or pattern", () => {
    testParse("pattern", "x or y", {
        type: "or",
        patterns: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
    });
});

test("complex or pattern", () => {
    testParse("pattern", "x or y or z", {
        type: "or",
        patterns: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
            { type: "variable", variable: { value: "z" } },
        ],
    });
});
