import { test } from "mocha";
import { parseExpression, testParse } from ".";

test("parsing variable expression", () => {
    testParse(parseExpression, "foo", {
        type: "variable",
        variable: { value: "foo" },
    });
});

test("parsing number expression", () => {
    testParse(parseExpression, "3.14", {
        type: "number",
        value: { value: "3.14" },
    });
});

test("parsing string expression", () => {
    testParse(parseExpression, `"abc"`, {
        type: "string",
        value: { value: "abc" },
    });
});

test("parsing format expression", () => {
    testParse(parseExpression, `"Hello, _!" name`, {
        type: "format",
        string: { value: "Hello, _!" },
        inputs: [
            {
                type: "variable",
                variable: { value: "name" },
            },
        ],
    });
});

test("parsing structure expression", () => {
    testParse(
        parseExpression,
        `Foo {
        a : b
        c : d
    }`,
        {
            type: "structure",
            name: { value: "Foo" },
            fields: [
                {
                    name: { value: "a" },
                    value: { type: "variable", variable: { value: "b" } },
                },
                {
                    name: { value: "c" },
                    value: { type: "variable", variable: { value: "d" } },
                },
            ],
        },
    );
});

test("parsing block expression", () => {
    testParse(parseExpression, "{foo}", {
        type: "block",
        statements: [
            {
                type: "expression",
                comments: [],
                expression: {
                    type: "variable",
                    variable: { value: "foo" },
                },
            },
        ],
    });
});

test("parsing do expression", () => {
    testParse(parseExpression, "do foo", {
        type: "do",
        input: {
            type: "variable",
            variable: { value: "foo" },
        },
    });
});

test("parsing simple intrinsic expression", () => {
    testParse(parseExpression, `intrinsic "message"`, {
        type: "intrinsic",
        name: { value: "message" },
        inputs: [],
    });
});

test("parsing complex intrinsic expression", () => {
    testParse(parseExpression, `intrinsic "message" x y`, {
        type: "intrinsic",
        name: { value: "message" },
        inputs: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
    });
});

test("parsing when expression", () => {
    testParse(
        parseExpression,
        `when x {
        a -> b
        c -> d
    }`,
        {
            type: "when",
            input: { type: "variable", variable: { value: "x" } },
            arms: [
                {
                    pattern: { type: "variable", variable: { value: "a" } },
                    value: { type: "variable", variable: { value: "b" } },
                },
                {
                    pattern: { type: "variable", variable: { value: "c" } },
                    value: { type: "variable", variable: { value: "d" } },
                },
            ],
        },
    );
});

test("parsing call expression", () => {
    testParse(parseExpression, "f x y", {
        type: "call",
        function: { type: "variable", variable: { value: "f" } },
        inputs: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
    });
});

test("parsing annotate expression", () => {
    testParse(parseExpression, "(3.14 :: Number)", {
        type: "annotate",
        left: {
            type: "number",
            value: { value: "3.14" },
        },
        right: {
            type: "named",
            name: { value: "Number" },
            parameters: [],
        },
    });
});

test("parsing simple apply expression", () => {
    testParse(parseExpression, "x . f", {
        type: "operator",
        operator: "applyOperator",
        left: { type: "variable", variable: { value: "x" } },
        right: { type: "variable", variable: { value: "f" } },
    });
});

test("parsing complex apply expression", () => {
    testParse(parseExpression, "a b . c d", {
        type: "operator",
        operator: "applyOperator",
        left: {
            type: "call",
            function: { type: "variable", variable: { value: "a" } },
            inputs: [{ type: "variable", variable: { value: "b" } }],
        },
        right: {
            type: "call",
            function: { type: "variable", variable: { value: "c" } },
            inputs: [{ type: "variable", variable: { value: "d" } }],
        },
    });
});

test("parsing as expression", () => {
    testParse(parseExpression, "x as T", {
        type: "as",
        left: { type: "variable", variable: { value: "x" } },
        right: { type: "named", name: { value: "T" }, parameters: [] },
    });
});

test("parsing add expression", () => {
    testParse(parseExpression, "a + b", {
        type: "operator",
        operator: "addOperator",
        left: { type: "variable", variable: { value: "a" } },
        right: { type: "variable", variable: { value: "b" } },
    });
});

test("parsing empty collection expression", () => {
    testParse(parseExpression, "(,)", {
        type: "collection",
        elements: [],
    });
});

test("parsing single line collection expression", () => {
    testParse(parseExpression, "a , b , c", {
        type: "collection",
        elements: [
            { type: "variable", variable: { value: "a" } },
            { type: "variable", variable: { value: "b" } },
            { type: "variable", variable: { value: "c" } },
        ],
    });
});

test("parsing multiline collection expression", () => {
    testParse(
        parseExpression,
        `(
        a ,
        b ,
        c ,
    )`,
        {
            type: "collection",
            elements: [
                { type: "variable", variable: { value: "a" } },
                { type: "variable", variable: { value: "b" } },
                { type: "variable", variable: { value: "c" } },
            ],
        },
    );
});

test("parsing single input function expression", () => {
    testParse(parseExpression, "x -> y", {
        type: "function",
        inputs: [{ type: "variable", variable: { value: "x" } }],
        output: { type: "variable", variable: { value: "y" } },
    });
});

test("parsing multi input function expression", () => {
    testParse(parseExpression, "x y -> z", {
        type: "function",
        inputs: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
        output: { type: "variable", variable: { value: "z" } },
    });
});

test("parsing complex input function expression", () => {
    testParse(parseExpression, "(X y) -> z", {
        type: "function",
        inputs: [
            {
                type: "constructor",
                constructor: { value: "X" },
                elements: [{ type: "variable", variable: { value: "y" } }],
            },
        ],
        output: { type: "variable", variable: { value: "z" } },
    });
});

test("parsing simple is expression", () => {
    testParse(parseExpression, "x is None", {
        type: "is",
        left: { type: "variable", variable: { value: "x" } },
        right: {
            type: "constructor",
            constructor: { value: "None" },
            elements: [],
        },
    });
});

test("parsing complex is expression", () => {
    testParse(parseExpression, "x is Some 3.14", {
        type: "is",
        left: { type: "variable", variable: { value: "x" } },
        right: {
            type: "constructor",
            constructor: { value: "Some" },
            elements: [{ type: "number", value: { value: "3.14" } }],
        },
    });
});
