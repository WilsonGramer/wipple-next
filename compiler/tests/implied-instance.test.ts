import { compileTest } from ".";

test("implied instance", () => {
    const { feedback } = compileTest("implied-instance.wipple");

    // There should be no errors
    expect(feedback.values().toArray()).toEqual([]);
});
