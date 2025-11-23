import { testParse } from ".";
import { parseConstraint } from "./constraints";

testParse("parsing bound constraint", parseConstraint, `(Foo value)`);

testParse("parsing default constraint", parseConstraint, `(value :: Number)`);
