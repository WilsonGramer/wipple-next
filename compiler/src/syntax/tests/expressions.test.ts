import { describe, expect, test } from "vitest";
import { testParse } from "..";

describe("parsing expressions", () => {
    test("parsing variable expression", () => {
        expect(testParse("Expression", "foo")).toMatchSnapshot();
    });

    test("parsing number expression", () => {
        expect(testParse("Expression", "3.14")).toMatchSnapshot();
    });

    test("parsing string expression", () => {
        expect(testParse("Expression", `"abc"`)).toMatchSnapshot();
    });

    test("parsing format expression", () => {
        expect(testParse("Expression", `"Hello, _!" name`)).toMatchSnapshot();
    });

    test("parsing structure expression", () => {
        expect(
            testParse(
                "Expression",
                `Foo {
    a : b
    c : d
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing block expression", () => {
        expect(testParse("Expression", "{foo}")).toMatchSnapshot();
    });

    test("parsing do expression", () => {
        expect(testParse("Expression", "do foo")).toMatchSnapshot();
    });

    test("parsing simple intrinsic expression", () => {
        expect(testParse("Expression", `intrinsic "message"`)).toMatchSnapshot();
    });

    test("parsing complex intrinsic expression", () => {
        expect(testParse("Expression", `intrinsic "message" x y`)).toMatchSnapshot();
    });

    test("parsing when expression", () => {
        expect(
            testParse(
                "Expression",
                `when x {
    a -> b
    c -> d
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing call expression", () => {
        expect(testParse("Expression", "f x y")).toMatchSnapshot();
    });

    test("parsing annotate expression", () => {
        expect(testParse("Expression", "(3.14 :: Number)")).toMatchSnapshot();
    });

    test("parsing simple apply expression", () => {
        expect(testParse("Expression", "x . f")).toMatchSnapshot();
    });

    test("parsing complex apply expression", () => {
        expect(testParse("Expression", "a b . c d")).toMatchSnapshot();
    });

    test("parsing as expression", () => {
        expect(testParse("Expression", "x as T")).toMatchSnapshot();
    });

    test("parsing add expression", () => {
        expect(testParse("Expression", "a + b")).toMatchSnapshot();
    });

    test("parsing empty collection expression", () => {
        expect(testParse("Expression", "(,)")).toMatchSnapshot();
    });

    test("parsing single line collection expression", () => {
        expect(testParse("Expression", "a, b, c")).toMatchSnapshot();
    });

    test("parsing multiline collection expression", () => {
        expect(
            testParse(
                "Expression",
                `(
    a,
    b,
    c,
    )`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing single input function expression", () => {
        expect(testParse("Expression", "x -> y")).toMatchSnapshot();
    });

    test("parsing multi input function expression", () => {
        expect(testParse("Expression", "x y -> z")).toMatchSnapshot();
    });

    test("parsing complex input function expression", () => {
        expect(testParse("Expression", "(X y) -> z")).toMatchSnapshot();
    });

    test("parsing simple is expression", () => {
        expect(testParse("Expression", "x is None")).toMatchSnapshot();
    });

    test("parsing complex is expression", () => {
        expect(testParse("Expression", "x is Some 3.14")).toMatchSnapshot();
    });
});
