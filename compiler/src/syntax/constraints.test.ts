import { test } from "mocha";
import { parseConstraint, testParse } from ".";

test("parsing bound constraint", () => {
    testParse(parseConstraint, `(Foo value)`, {
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

test("parsing default constraint", () => {
    testParse(parseConstraint, `(value :: Number)`, {
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
