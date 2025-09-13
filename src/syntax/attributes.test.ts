import test from "node:test";
import { testParse } from ".";

test("named attribute", () => {
    testParse("attribute", "[foo]", {
        name: { value: "foo" },
        value: null,
    });
});

test("valued attribute", () => {
    testParse("attribute", `[a : "b"]`, {
        name: { value: "a" },
        value: {
            type: "text",
            value: { value: "b" },
        },
    });
});
