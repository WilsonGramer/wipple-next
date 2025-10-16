import test from "node:test";
import { compileTest } from ".";
import assert from "node:assert";
import { HasType } from "../src/compile";

test("default constraint", () => {
    const { db, placeholders } = compileTest("default-constraint.wipple");

    assert.deepStrictEqual(db.display(placeholders[1], HasType), ["List String"]);
    assert.deepStrictEqual(db.display(placeholders[2], HasType), ["Set String"]);
});
