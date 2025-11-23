import { compileTest, testTypes } from ".";

test("sequence", () => {
    const { placeholders, feedback } = compileTest("sequence.wipple");

    testTypes(placeholders[2], ["Number", "String"]);
    expect(feedback.get(placeholders[2])).toContain("conflicting-types");
});
