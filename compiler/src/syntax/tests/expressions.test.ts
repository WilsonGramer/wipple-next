import { describe, expect, test } from "vitest";
import { testParse } from "..";
import { parseBlockExpression, parseExpression } from "../grammar";

describe("parsing expressions", () => {
    test("parsing variable expression", () => {
        expect(testParse(parseExpression, "foo")).toMatchSnapshot();
    });

    test("parsing number expression", () => {
        expect(testParse(parseExpression, "3.14")).toMatchSnapshot();
    });

    test("parsing string expression", () => {
        expect(testParse(parseExpression, `"abc"`)).toMatchSnapshot();
    });

    test("parsing format expression", () => {
        expect(testParse(parseExpression, `"Hello, _!" name`)).toMatchSnapshot();
    });

    test("parsing structure expression", () => {
        expect(
            testParse(
                parseExpression,
                `Foo {
    a : b
    c : d
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing empty block expression", () => {
        expect(testParse(parseBlockExpression, "{}")).toMatchSnapshot();
    });

    test("parsing block expression", () => {
        expect(testParse(parseExpression, "{foo}")).toMatchSnapshot();
    });

    test("parsing do expression", () => {
        expect(testParse(parseExpression, "do foo")).toMatchSnapshot();
    });

    test("parsing simple intrinsic expression", () => {
        expect(testParse(parseExpression, `intrinsic "message"`)).toMatchSnapshot();
    });

    test("parsing complex intrinsic expression", () => {
        expect(testParse(parseExpression, `intrinsic "message" x y`)).toMatchSnapshot();
    });

    test("parsing when expression", () => {
        expect(
            testParse(
                parseExpression,
                `when x {
    a -> b
    c -> d
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing call expression", () => {
        expect(testParse(parseExpression, "f x y")).toMatchSnapshot();
    });

    test("parsing annotate expression", () => {
        expect(testParse(parseExpression, "(3.14 :: Number)")).toMatchSnapshot();
    });

    test("parsing simple apply expression", () => {
        expect(testParse(parseExpression, "x . f")).toMatchSnapshot();
    });

    test("parsing complex apply expression", () => {
        expect(testParse(parseExpression, "a b . c d")).toMatchSnapshot();
    });

    test("parsing as expression", () => {
        expect(testParse(parseExpression, "x as T")).toMatchSnapshot();
    });

    test("parsing add expression", () => {
        expect(testParse(parseExpression, "a + b")).toMatchSnapshot();
    });

    test("parsing empty collection expression", () => {
        expect(testParse(parseExpression, "(,)")).toMatchSnapshot();
    });

    test("parsing single element collection expression", () => {
        expect(testParse(parseExpression, "a,")).toMatchSnapshot();
    });

    test("parsing single line collection expression", () => {
        expect(testParse(parseExpression, "a, b, c")).toMatchSnapshot();
    });

    test("parsing multiline collection expression", () => {
        expect(
            testParse(
                parseExpression,
                `(
    a,
    b,
    c,
    )`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing single input function expression", () => {
        expect(testParse(parseExpression, "x -> y")).toMatchSnapshot();
    });

    test("parsing multi input function expression", () => {
        expect(testParse(parseExpression, "x y -> z")).toMatchSnapshot();
    });

    test("parsing complex input function expression", () => {
        expect(testParse(parseExpression, "(X y) -> z")).toMatchSnapshot();
    });

    test("parsing simple is expression", () => {
        expect(testParse(parseExpression, "x is None")).toMatchSnapshot();
    });

    test("parsing complex is expression", () => {
        expect(testParse(parseExpression, "x is Some 3.14")).toMatchSnapshot();
    });
});
