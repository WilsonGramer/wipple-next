import { describe, expect, test } from "vitest";
import { testParse } from "..";
import { parseConstraint } from "../grammar";

describe("parsing constraints", () => {
    test("parsing bound constraint", () => {
        expect(testParse(parseConstraint, `(Foo value)`)).toMatchSnapshot();
    });

    test("parsing default constraint", () => {
        expect(testParse(parseConstraint, `(value :: Number)`)).toMatchSnapshot();
    });
});
