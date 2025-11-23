import { testParse } from ".";
import { parseType } from "./types";

testParse("parsing placeholder type", parseType, "_");

testParse("parsing unit type", parseType, "()");

testParse("parsing simple named type", parseType, "Number");

testParse("parsing complex named type", parseType, "Maybe Number");

testParse("parsing block type", parseType, "{Number}");

testParse("parsing single input function type", parseType, "Number -> ()");

testParse("parsing multi input function type", parseType, "Number Number -> ()");

testParse("parsing complex input function type", parseType, "(Maybe Number) Number -> ()");
