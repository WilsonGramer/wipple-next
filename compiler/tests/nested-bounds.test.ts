import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";

test("nested bounds", () => {
    const { feedback } = compileTest("nested-bounds.wipple");

    // There should only be one 'unresolved-bound' error
    assert.deepStrictEqual(feedback.values().toArray(), [["unresolved-bound"]]);
});
