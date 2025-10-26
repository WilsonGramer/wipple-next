import { test } from "mocha";
import { compileTest } from ".";
import assert from "node:assert";
import { HasType } from "../src/compile";
import { AssignedTo } from "../src/visit/statements/assignment";
import { FunctionInCallExpression } from "../src/visit/expressions/call";

test("custom errors", () => {
    const { db, placeholders, feedback } = compileTest("custom-errors.wipple");

    assert.deepStrictEqual(db.display(placeholders[2], HasType), ["Number"]);
    assert.deepStrictEqual(db.display(placeholders[3], HasType), ["String"]);
    assert.deepStrictEqual(db.display(placeholders[4], HasType), []);
    assert.deepStrictEqual(db.display(placeholders[5], HasType), []);

    const valueOfPlaceholder4 = db.get(placeholders[4], AssignedTo)!;
    const functionOfPlaceholder4 = db.find(FunctionInCallExpression, valueOfPlaceholder4)!;
    assert.partialDeepStrictEqual(feedback.get(functionOfPlaceholder4), ["error-instance"]);

    const valueOfPlaceholder5 = db.get(placeholders[5], AssignedTo)!;
    const functionOfPlaceholder5 = db.find(FunctionInCallExpression, valueOfPlaceholder5)!;
    assert.partialDeepStrictEqual(feedback.get(functionOfPlaceholder5), ["error-instance"]);
});
