import { describe, expect, test } from "vitest";
import { testParse } from "..";
import { parseAttribute } from "../grammar";

describe("parsing attributes", () => {
    test("parsing named attribute", () => {
        expect(testParse(parseAttribute, "[foo]")).toMatchSnapshot();
    });

    test("parsing valued attribute", () => {
        expect(testParse(parseAttribute, `[a : "b"]`)).toMatchSnapshot();
    });
});
