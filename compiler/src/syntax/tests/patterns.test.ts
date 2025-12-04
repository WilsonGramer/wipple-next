import { describe, expect, test } from "vitest";
import { testParse } from "..";
import { parsePattern } from "../grammar";

describe("parsing patterns", () => {
    test("parsing wildcard pattern", () => {
        expect(testParse(parsePattern, "_")).toMatchSnapshot();
    });

    test("parsing variable pattern", () => {
        expect(testParse(parsePattern, "x")).toMatchSnapshot();
    });

    test("parsing structure pattern", () => {
        expect(testParse(parsePattern, "Foo {x : y}")).toMatchSnapshot();
    });

    test("parsing set pattern", () => {
        expect(testParse(parsePattern, "set x")).toMatchSnapshot();
    });

    test("parsing simple constructor pattern", () => {
        expect(testParse(parsePattern, "None")).toMatchSnapshot();
    });

    test("parsing complex constructor pattern", () => {
        expect(testParse(parsePattern, "Some x y z")).toMatchSnapshot();
    });

    test("parsing simple or pattern", () => {
        expect(testParse(parsePattern, "x or y")).toMatchSnapshot();
    });

    test("parsing complex or pattern", () => {
        expect(testParse(parsePattern, "x or y or z")).toMatchSnapshot();
    });
});
