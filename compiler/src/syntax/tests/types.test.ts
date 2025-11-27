import { describe, expect, test } from "vitest";
import { testParse } from "..";

describe("parsing types", () => {
    test("parsing placeholder type", () => {
        expect(testParse("Type", "_")).toMatchSnapshot();
    });

    test("parsing unit type", () => {
        expect(testParse("Type", "()")).toMatchSnapshot();
    });

    test("parsing simple named type", () => {
        expect(testParse("Type", "Number")).toMatchSnapshot();
    });

    test("parsing complex named type", () => {
        expect(testParse("Type", "Maybe Number")).toMatchSnapshot();
    });

    test("parsing block type", () => {
        expect(testParse("Type", "{Number}")).toMatchSnapshot();
    });

    test("parsing single input function type", () => {
        expect(testParse("Type", "Number -> ()")).toMatchSnapshot();
    });

    test("parsing multi input function type", () => {
        expect(testParse("Type", "Number Number -> ()")).toMatchSnapshot();
    });

    test("parsing complex input function type", () => {
        expect(testParse("Type", "(Maybe Number) Number -> ()")).toMatchSnapshot();
    });
});
