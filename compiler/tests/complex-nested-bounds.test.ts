import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";

test("complex nested bounds", () => {
    const { feedback } = compileTest("complex-nested-bounds.wipple");

    // There should be no errors
    assert.deepStrictEqual(feedback.values().toArray(), []);
});
