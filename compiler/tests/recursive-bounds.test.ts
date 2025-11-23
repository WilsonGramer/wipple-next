import { compileTest } from ".";

test("recursive bounds", () => {
    const { feedback } = compileTest("recursive-bounds.wipple");

    // There should only be one 'unresolved-bound' error
    expect(feedback.values().toArray()).toEqual([["unresolved-bound"]]);
});
