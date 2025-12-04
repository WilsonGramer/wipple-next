import { describe, expect, test } from "vitest";
import { testParse } from "..";
import { parseType } from "../grammar";

describe("parsing types", () => {
    test("parsing placeholder type", () => {
        expect(testParse(parseType, "_")).toMatchSnapshot();
    });

    test("parsing unit type", () => {
        expect(testParse(parseType, "()")).toMatchSnapshot();
    });

    test("parsing simple named type", () => {
        expect(testParse(parseType, "Number")).toMatchSnapshot();
    });

    test("parsing complex named type", () => {
        expect(testParse(parseType, "Maybe Number")).toMatchSnapshot();
    });

    test("parsing block type", () => {
        expect(testParse(parseType, "{Number}")).toMatchSnapshot();
    });

    test("parsing single input function type", () => {
        expect(testParse(parseType, "Number -> ()")).toMatchSnapshot();
    });

    test("parsing multi input function type", () => {
        expect(testParse(parseType, "Number Number -> ()")).toMatchSnapshot();
    });

    test("parsing complex input function type", () => {
        expect(testParse(parseType, "(Maybe Number) Number -> ()")).toMatchSnapshot();
    });
});
