import test from "node:test";
import { testParse } from ".";

test("variable expression", () => {
    testParse("expression", "foo", {
        type: "variable",
        variable: { value: "foo" },
    });
});

test("number expression", () => {
    testParse("expression", "3.14", {
        type: "number",
        value: { value: "3.14" },
    });
});

test("string expression", () => {
    testParse("expression", `"abc"`, {
        type: "string",
        value: { value: "abc" },
    });
});

test("format expression", () => {
    testParse("expression", `"Hello, _!" name`, {
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

test("structure expression", () => {
    testParse(
        "expression",
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

test("block expression", () => {
    testParse("expression", "{foo}", {
        type: "block",
        statements: [
            {
                type: "expression",
                comments: { comments: [] },
                expression: {
                    type: "variable",
                    variable: { value: "foo" },
                },
            },
        ],
    });
});

test("do expression", () => {
    testParse("expression", "do foo", {
        type: "do",
        input: {
            type: "variable",
            variable: { value: "foo" },
        },
    });
});

test("simple intrinsic expression", () => {
    testParse("expression", `intrinsic "message"`, {
        type: "intrinsic",
        name: { value: "message" },
        inputs: [],
    });
});

test("complex intrinsic expression", () => {
    testParse("expression", `intrinsic "message" x y`, {
        type: "intrinsic",
        name: { value: "message" },
        inputs: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
    });
});

test("when expression", () => {
    testParse(
        "expression",
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

test("call expression", () => {
    testParse("expression", "f x y", {
        type: "call",
        function: { type: "variable", variable: { value: "f" } },
        inputs: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
    });
});

test("annotate expression", () => {
    testParse("expression", "(3.14 :: Number)", {
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

test("simple apply expression", () => {
    testParse("expression", "x . f", {
        type: "binary",
        operator: ".",
        left: { type: "variable", variable: { value: "x" } },
        right: { type: "variable", variable: { value: "f" } },
    });
});

test("complex apply expression", () => {
    testParse("expression", "a b . c d", {
        type: "binary",
        operator: ".",
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

test("as expression", () => {
    testParse("expression", "x as T", {
        type: "as",
        left: { type: "variable", variable: { value: "x" } },
        right: { type: "named", name: { value: "T" }, parameters: [] },
    });
});

test("add expression", () => {
    testParse("expression", "a + b", {
        type: "binary",
        operator: "+",
        left: { type: "variable", variable: { value: "a" } },
        right: { type: "variable", variable: { value: "b" } },
    });
});

test("empty collection expression", () => {
    testParse("expression", "(,)", {
        type: "collection",
        elements: [],
    });
});

test("single line collection expression", () => {
    testParse("expression", "a , b , c", {
        type: "collection",
        elements: [
            { type: "variable", variable: { value: "a" } },
            { type: "variable", variable: { value: "b" } },
            { type: "variable", variable: { value: "c" } },
        ],
    });
});

test("multiline collection expression", () => {
    testParse(
        "expression",
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

test("single input function expression", () => {
    testParse("expression", "x -> y", {
        type: "function",
        inputs: [{ type: "variable", variable: { value: "x" } }],
        output: { type: "variable", variable: { value: "y" } },
    });
});

test("multi input function expression", () => {
    testParse("expression", "x y -> z", {
        type: "function",
        inputs: [
            { type: "variable", variable: { value: "x" } },
            { type: "variable", variable: { value: "y" } },
        ],
        output: { type: "variable", variable: { value: "z" } },
    });
});

test("complex input function expression", () => {
    testParse("expression", "(X y) -> z", {
        type: "function",
        inputs: [
            {
                type: "variant",
                variant: { value: "X" },
                elements: [{ type: "variable", variable: { value: "y" } }],
            },
        ],
        output: { type: "variable", variable: { value: "z" } },
    });
});

test("simple is expression", () => {
    testParse("expression", "x is None", {
        type: "is",
        left: { type: "variable", variable: { value: "x" } },
        right: {
            type: "variant",
            variant: { value: "None" },
            elements: [],
        },
    });
});

test("complex is expression", () => {
    testParse("expression", "x is Some 3.14", {
        type: "is",
        left: { type: "variable", variable: { value: "x" } },
        right: {
            type: "variant",
            variant: { value: "Some" },
            elements: [{ type: "number", value: { value: "3.14" } }],
        },
    });
});
