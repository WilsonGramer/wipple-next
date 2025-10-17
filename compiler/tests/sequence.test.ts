import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";
import { HasType } from "../src/compile";

test("sequence", () => {
    const { db, placeholders, feedback } = compileTest("sequence.wipple");

    assert.deepStrictEqual(db.display(placeholders[2], HasType), ["Number", "String"]);
    assert.partialDeepStrictEqual(feedback.get(placeholders[2]), ["conflicting-types"]);
});
