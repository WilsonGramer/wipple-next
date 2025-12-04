import { describe, expect, test } from "vitest";
import { testParse } from "..";
import { parseStatement } from "../grammar";

describe("parsing statements", () => {
    test("parsing type definition", () => {
        expect(
            testParse(parseStatement, "-- Documentation comment\n[foo]\nFoo : type"),
        ).toMatchSnapshot();
    });

    test("parsing generic type definition", () => {
        expect(testParse(parseStatement, "Foo : value => type")).toMatchSnapshot();
    });

    test("parsing marker type definition", () => {
        expect(testParse(parseStatement, "Foo : type")).toMatchSnapshot();
    });

    test("parsing structure type definition", () => {
        expect(
            testParse(
                parseStatement,
                `Foo : type {
    a :: A
    b :: B
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing enumeration type definition", () => {
        expect(
            testParse(
                parseStatement,
                `Foo : type {
    Some Number
    None
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing trait definition", () => {
        expect(testParse(parseStatement, "Foo : trait Number")).toMatchSnapshot();
    });

    test("parsing generic trait definition", () => {
        expect(
            testParse(parseStatement, "Foo : value => trait (value -> Number)"),
        ).toMatchSnapshot();
    });

    test("parsing constant definition", () => {
        expect(
            testParse(parseStatement, "show :: value -> Unit where (Show value)"),
        ).toMatchSnapshot();
    });

    test("parsing simple valued instance definition", () => {
        expect(testParse(parseStatement, "instance (Foo Number) : 3.14")).toMatchSnapshot();
    });

    test("parsing complex valued instance definition", () => {
        expect(
            testParse(parseStatement, "instance (Foo (Maybe value)) where (Foo value) : 3.14"),
        ).toMatchSnapshot();
    });

    test("parsing assignment", () => {
        expect(testParse(parseStatement, "x : 123")).toMatchSnapshot();
    });

    test("parsing expression statement", () => {
        expect(testParse(parseStatement, "123")).toMatchSnapshot();
    });
});
