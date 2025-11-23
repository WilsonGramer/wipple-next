import { compileTest, testTypes } from ".";

test("default constraint", () => {
    const { placeholders } = compileTest("default-constraint.wipple");

    testTypes(placeholders[1], ["List String"]);
    testTypes(placeholders[2], ["Set String"]);
});
