import { test } from "mocha";
import { parseAttribute, testParse } from ".";

test("parsing named attribute", () => {
    testParse(parseAttribute, "[foo]", {
        name: { value: "foo" },
        value: undefined,
    });
});

test("parsing valued attribute", () => {
    testParse(parseAttribute, `[a : "b"]`, {
        name: { value: "a" },
        value: {
            type: "string",
            value: { value: "b" },
        },
    });
});
