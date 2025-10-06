import test from "node:test";
import { testParse } from ".";

test("bound constraint", () => {
    testParse("constraint", `(Foo value)`, {
        type: "bound",
        trait: { value: "Foo" },
        parameters: [
            {
                type: "parameter",
                name: { value: "value" },
            },
        ],
    });
});

test("default constraint", () => {
    testParse("constraint", `(value :: Number)`, {
        type: "default",
        parameter: {
            type: "parameter",
            name: { value: "value" },
        },
        value: {
            type: "named",
            name: { value: "Number" },
            parameters: [],
        },
    });
});
