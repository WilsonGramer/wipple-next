import test from "node:test";
import { testParse } from ".";

test("placeholder type", () => {
    testParse("type", "_", {
        type: "placeholder",
    });
});

test("unit type", () => {
    testParse("type", "()", {
        type: "unit",
    });
});

test("simple named type", () => {
    testParse("type", "Number", {
        type: "named",
        name: { value: "Number" },
        parameters: [],
    });
});

test("complex named type", () => {
    testParse("type", "Maybe Number", {
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

test("block type", () => {
    testParse("type", "{Number}", {
        type: "block",
        output: {
            type: "named",
            name: { value: "Number" },
            parameters: [],
        },
    });
});

test("single input function type", () => {
    testParse("type", "Number -> ()", {
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

test("multi input function type", () => {
    testParse("type", "Number Number -> ()", {
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

test("complex input function type", () => {
    testParse("type", "(Maybe Number) Number -> ()", {
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
