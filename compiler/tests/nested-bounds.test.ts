import { compileTest } from ".";

test("nested bounds", () => {
    const { feedback } = compileTest("nested-bounds.wipple");

    // There should only be one 'unresolved-bound' error
    expect(feedback.values().toArray()).toEqual([["unresolved-bound"]]);
});
