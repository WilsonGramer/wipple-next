import { testParse } from ".";
import { parseStatement } from "./statements";

testParse("parsing type definition", parseStatement, "-- Documentation comment\n[foo]\nFoo : type");

testParse("parsing generic type definition", parseStatement, "Foo : value => type");

testParse("parsing marker type definition", parseStatement, "Foo : type");

testParse(
    "parsing structure type definition",
    parseStatement,
    `Foo : type {
a :: A
b :: B
    }`,
);

testParse(
    "parsing enumeration type definition",
    parseStatement,
    `Foo : type {
Some Number
None
    }`,
);

testParse("parsing trait definition", parseStatement, "Foo : trait Number");

testParse(
    "parsing generic trait definition",
    parseStatement,
    "Foo : value => trait (value -> Number)",
);

testParse(
    "parsing constant definition",
    parseStatement,
    "show :: value -> Unit where (Show value)",
);

testParse(
    "parsing simple valued instance definition",
    parseStatement,
    "instance (Foo Number) : 3.14",
);

testParse(
    "parsing complex valued instance definition",
    parseStatement,
    "instance (Foo (Maybe value)) where (Foo value) : 3.14",
);
