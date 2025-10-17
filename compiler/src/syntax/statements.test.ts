import { test } from "mocha";
import { parseStatement, testParse } from ".";

test("parsing type definition", () => {
    testParse(parseStatement, "-- Documentation comment\n[foo]\nFoo : type", {
        type: "typeDefinition",
        comments: [{ value: " Documentation comment" }],
        attributes: [{ name: { value: "foo" }, value: undefined }],
        name: { value: "Foo" },
        parameters: [],
        representation: { type: "marker" },
    });
});

test("parsing generic type definition", () => {
    testParse(parseStatement, "Foo : value => type", {
        type: "typeDefinition",
        comments: [],
        attributes: [],
        name: { value: "Foo" },
        parameters: [{ name: { value: "value" } }],
        representation: { type: "marker" },
    });
});

test("parsing marker type definition", () => {
    testParse(parseStatement, "Foo : type", {
        type: "typeDefinition",
        comments: [],
        attributes: [],
        name: { value: "Foo" },
        parameters: [],
        representation: { type: "marker" },
    });
});

test("parsing structure type definition", () => {
    testParse(
        parseStatement,
        `Foo : type {
            a :: A
            b :: B
        }`,
        {
            type: "typeDefinition",
            comments: [],
            attributes: [],
            name: { value: "Foo" },
            parameters: [],
            representation: {
                type: "structure",
                fields: [
                    {
                        name: { value: "a" },
                        type: { type: "named", name: { value: "A" }, parameters: [] },
                    },
                    {
                        name: { value: "b" },
                        type: { type: "named", name: { value: "B" }, parameters: [] },
                    },
                ],
            },
        }
    );
});

test("parsing enumeration type definition", () => {
    testParse(
        parseStatement,
        `Foo : type {
            Some Number
            None
        }`,
        {
            type: "typeDefinition",
            comments: [],
            attributes: [],
            name: { value: "Foo" },
            parameters: [],
            representation: {
                type: "enumeration",
                variants: [
                    {
                        name: { value: "Some" },
                        elements: [{ type: "named", name: { value: "Number" }, parameters: [] }],
                    },
                    {
                        name: { value: "None" },
                        elements: [],
                    },
                ],
            },
        }
    );
});

test("parsing trait definition", () => {
    testParse(parseStatement, "Foo : trait Number", {
        type: "traitDefinition",
        comments: [],
        attributes: [],
        name: { value: "Foo" },
        parameters: [],
        constraints: {
            type: { type: "named", name: { value: "Number" }, parameters: [] },
            constraints: [],
        },
    });
});

test("parsing generic trait definition", () => {
    testParse(parseStatement, "Foo : value => trait (value -> Number)", {
        type: "traitDefinition",
        comments: [],
        attributes: [],
        name: { value: "Foo" },
        parameters: [{ name: { value: "value" } }],
        constraints: {
            type: {
                type: "function",
                inputs: [{ type: "parameter", name: { value: "value" } }],
                output: { type: "named", name: { value: "Number" }, parameters: [] },
            },
            constraints: [],
        },
    });
});

test("parsing constant definition", () => {
    testParse(parseStatement, "show :: value -> Unit where (Show value)", {
        type: "constantDefinition",
        comments: [],
        attributes: [],
        name: { value: "show" },
        constraints: {
            type: {
                type: "function",
                inputs: [{ type: "parameter", name: { value: "value" } }],
                output: { type: "named", name: { value: "Unit" }, parameters: [] },
            },
            constraints: [
                {
                    type: "bound",
                    trait: { value: "Show" },
                    parameters: [{ type: "parameter", name: { value: "value" } }],
                },
            ],
        },
    });
});

test("parsing simple valued instance definition", () => {
    testParse(parseStatement, "instance (Foo Number) : 3.14", {
        type: "instanceDefinition",
        comments: [],
        attributes: [],
        constraints: {
            bound: {
                type: "bound",
                trait: { value: "Foo" },
                parameters: [{ type: "named", name: { value: "Number" }, parameters: [] }],
            },
            constraints: [],
        },
        value: { type: "number", value: { value: "3.14" } },
    });
});

test("parsing complex valued instance definition", () => {
    testParse(parseStatement, "instance (Foo (Maybe value)) where (Foo value) : 3.14", {
        type: "instanceDefinition",
        comments: [],
        attributes: [],
        constraints: {
            bound: {
                type: "bound",
                trait: { value: "Foo" },
                parameters: [
                    {
                        type: "named",
                        name: { value: "Maybe" },
                        parameters: [{ type: "parameter", name: { value: "value" } }],
                    },
                ],
            },
            constraints: [
                {
                    type: "bound",
                    trait: { value: "Foo" },
                    parameters: [{ type: "parameter", name: { value: "value" } }],
                },
            ],
        },
        value: { type: "number", value: { value: "3.14" } },
    });
});
