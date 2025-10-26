import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";

test("recursive bounds", () => {
    const { feedback } = compileTest("recursive-bounds.wipple");

    // There should only be one 'unresolved-bound' error
    assert.deepStrictEqual(feedback.values().toArray(), [["unresolved-bound"]]);
});
