import { describe, expect, test } from "vitest";
import { testParse } from "..";

describe("parsing statements", () => {
    test("parsing type definition", () => {
        expect(
            testParse("Statement", "-- Documentation comment\n[foo]\nFoo : type"),
        ).toMatchSnapshot();
    });

    test("parsing generic type definition", () => {
        expect(testParse("Statement", "Foo : value => type")).toMatchSnapshot();
    });

    test("parsing marker type definition", () => {
        expect(testParse("Statement", "Foo : type")).toMatchSnapshot();
    });

    test("parsing structure type definition", () => {
        expect(
            testParse(
                "Statement",
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
                "Statement",
                `Foo : type {
    Some Number
    None
    }`,
            ),
        ).toMatchSnapshot();
    });

    test("parsing trait definition", () => {
        expect(testParse("Statement", "Foo : trait Number")).toMatchSnapshot();
    });

    test("parsing generic trait definition", () => {
        expect(testParse("Statement", "Foo : value => trait (value -> Number)")).toMatchSnapshot();
    });

    test("parsing constant definition", () => {
        expect(
            testParse("Statement", "show :: value -> Unit where (Show value)"),
        ).toMatchSnapshot();
    });

    test("parsing simple valued instance definition", () => {
        expect(testParse("Statement", "instance (Foo Number) : 3.14")).toMatchSnapshot();
    });

    test("parsing complex valued instance definition", () => {
        expect(
            testParse("Statement", "instance (Foo (Maybe value)) where (Foo value) : 3.14"),
        ).toMatchSnapshot();
    });
});
