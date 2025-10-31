import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";

test("implied instance", () => {
    const { feedback } = compileTest("implied-instance.wipple");

    // There should be no errors
    assert.deepStrictEqual(feedback.values().toArray(), []);
});
