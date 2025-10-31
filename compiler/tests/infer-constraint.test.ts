import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";
import { HasType } from "../src/compile";

test("infer constraint", () => {
    const { db, placeholders, feedback } = compileTest("infer-constraint.wipple");

    assert.deepStrictEqual(db.display(placeholders[2], HasType), new Set(["String"]));
    assert.deepStrictEqual(db.display(placeholders[5], HasType), new Set(["String", "Number"]));
    assert.partialDeepStrictEqual(feedback.get(placeholders[5]), ["conflicting-types"]);
});
