import { testParse } from ".";
import { parsePattern } from "./patterns";

testParse("parsing wildcard pattern", parsePattern, "_");

testParse("parsing variable pattern", parsePattern, "x");

testParse("parsing structure pattern", parsePattern, "Foo {x : y}");

testParse("parsing set pattern", parsePattern, "set x");

testParse("parsing simple constructor pattern", parsePattern, "None");

testParse("parsing complex constructor pattern", parsePattern, "Some x y z");

testParse("parsing simple or pattern", parsePattern, "x or y");

testParse("parsing complex or pattern", parsePattern, "x or y or z");
