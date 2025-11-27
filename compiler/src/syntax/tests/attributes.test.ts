import { describe, expect, test } from "vitest";
import { testParse } from "..";

describe("parsing attributes", () => {
    test("parsing named attribute", () => {
        expect(testParse("Attribute", "[foo]")).toMatchSnapshot();
    });

    test("parsing valued attribute", () => {
        expect(testParse("Attribute", `[a : "b"]`)).toMatchSnapshot();
    });
});
