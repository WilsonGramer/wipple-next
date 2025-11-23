import { testParse } from ".";
import { parseExpression } from "./expressions";

testParse("parsing variable expression", parseExpression, "foo");

testParse("parsing number expression", parseExpression, "3.14");

testParse("parsing string expression", parseExpression, `"abc"`);

testParse("parsing format expression", parseExpression, `"Hello, _!" name`);

testParse(
    "parsing structure expression",
    parseExpression,
    `Foo {
    a : b
    c : d
}`,
);

testParse("parsing block expression", parseExpression, "{foo}");

testParse("parsing do expression", parseExpression, "do foo");

testParse("parsing simple intrinsic expression", parseExpression, `intrinsic "message"`);

testParse("parsing complex intrinsic expression", parseExpression, `intrinsic "message" x y`);

testParse(
    "parsing when expression",
    parseExpression,
    `when x {
    a -> b
    c -> d
}`,
);

testParse("parsing call expression", parseExpression, "f x y");

testParse("parsing annotate expression", parseExpression, "(3.14 :: Number)");

testParse("parsing simple apply expression", parseExpression, "x . f");

testParse("parsing complex apply expression", parseExpression, "a b . c d");

testParse("parsing as expression", parseExpression, "x as T");

testParse("parsing add expression", parseExpression, "a + b");

testParse("parsing empty collection expression", parseExpression, "(,)");

testParse("parsing single line collection expression", parseExpression, "a , b , c");

testParse(
    "parsing multiline collection expression",
    parseExpression,
    `(
    a ,
    b ,
    c ,
)`,
);

testParse("parsing single input function expression", parseExpression, "x -> y");

testParse("parsing multi input function expression", parseExpression, "x y -> z");

testParse("parsing complex input function expression", parseExpression, "(X y) -> z");

testParse("parsing simple is expression", parseExpression, "x is None");

testParse("parsing complex is expression", parseExpression, "x is Some 3.14");
