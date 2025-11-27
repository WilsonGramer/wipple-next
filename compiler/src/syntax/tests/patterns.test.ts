import { describe, expect, test } from "vitest";
import { testParse } from "..";

describe("parsing patterns", () => {
    test("parsing wildcard pattern", () => {
        expect(testParse("Pattern", "_")).toMatchSnapshot();
    });

    test("parsing variable pattern", () => {
        expect(testParse("Pattern", "x")).toMatchSnapshot();
    });

    test("parsing structure pattern", () => {
        expect(testParse("Pattern", "Foo {x : y}")).toMatchSnapshot();
    });

    test("parsing set pattern", () => {
        expect(testParse("Pattern", "set x")).toMatchSnapshot();
    });

    test("parsing simple constructor pattern", () => {
        expect(testParse("Pattern", "None")).toMatchSnapshot();
    });

    test("parsing complex constructor pattern", () => {
        expect(testParse("Pattern", "Some x y z")).toMatchSnapshot();
    });

    test("parsing simple or pattern", () => {
        expect(testParse("Pattern", "x or y")).toMatchSnapshot();
    });

    test("parsing complex or pattern", () => {
        expect(testParse("Pattern", "x or y or z")).toMatchSnapshot();
    });
});
