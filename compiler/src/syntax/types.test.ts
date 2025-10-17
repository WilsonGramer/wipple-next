import { test } from "mocha";
import { parseType, testParse } from ".";

test("parsing placeholder type", () => {
    testParse(parseType, "_", {
        type: "placeholder",
    });
});

test("parsing unit type", () => {
    testParse(parseType, "()", {
        type: "unit",
    });
});

test("parsing simple named type", () => {
    testParse(parseType, "Number", {
        type: "named",
        name: { value: "Number" },
        parameters: [],
    });
});

test("parsing complex named type", () => {
    testParse(parseType, "Maybe Number", {
        type: "named",
        name: { value: "Maybe" },
        parameters: [
            {
                type: "named",
                name: { value: "Number" },
                parameters: [],
            },
        ],
    });
});

test("parsing block type", () => {
    testParse(parseType, "{Number}", {
        type: "block",
        output: {
            type: "named",
            name: { value: "Number" },
            parameters: [],
        },
    });
});

test("parsing single input function type", () => {
    testParse(parseType, "Number -> ()", {
        type: "function",
        inputs: [
            {
                type: "named",
                name: { value: "Number" },
                parameters: [],
            },
        ],
        output: {
            type: "unit",
        },
    });
});

test("parsing multi input function type", () => {
    testParse(parseType, "Number Number -> ()", {
        type: "function",
        inputs: [
            {
                type: "named",
                name: { value: "Number" },
                parameters: [],
            },
            {
                type: "named",
                name: { value: "Number" },
                parameters: [],
            },
        ],
        output: {
            type: "unit",
        },
    });
});

test("parsing complex input function type", () => {
    testParse(parseType, "(Maybe Number) Number -> ()", {
        type: "function",
        inputs: [
            {
                type: "named",
                name: { value: "Maybe" },
                parameters: [
                    {
                        type: "named",
                        name: { value: "Number" },
                        parameters: [],
                    },
                ],
            },
            {
                type: "named",
                name: { value: "Number" },
                parameters: [],
            },
        ],
        output: {
            type: "unit",
        },
    });
});
