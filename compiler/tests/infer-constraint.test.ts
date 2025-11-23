import { compileTest, testTypes } from ".";

test("infer constraint", () => {
    const { placeholders, feedback } = compileTest("infer-constraint.wipple");

    testTypes(placeholders[2], ["String"]);
    testTypes(placeholders[5], ["String", "Number"]);
    expect(feedback.get(placeholders[5])).toContain("conflicting-types");
});
