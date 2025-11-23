import { compileTest } from ".";

test("complex nested bounds", () => {
    const { feedback } = compileTest("complex-nested-bounds.wipple");

    // There should be no errors
    expect(feedback.values().toArray()).toEqual([]);
});
