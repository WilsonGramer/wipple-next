import { describe, expect, test } from "vitest";
import { testParse } from "..";

describe("parsing constraints", () => {
    test("parsing bound constraint", () => {
        expect(testParse("Constraint", `(Foo value)`)).toMatchSnapshot();
    });

    test("parsing default constraint", () => {
        expect(testParse("Constraint", `(value :: Number)`)).toMatchSnapshot();
    });
});
