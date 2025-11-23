import { testParse } from ".";
import { parseAttribute } from "./attributes";

testParse("parsing named attribute", parseAttribute, "[foo]");

testParse("parsing valued attribute", parseAttribute, `[a : "b"]`);
