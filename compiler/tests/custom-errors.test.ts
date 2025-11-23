import { compileTest, testTypes } from ".";
import { nodeFilter } from "../src/node";
import type { CallExpressionNode } from "../src/nodes/expressions/call";
import { ConstructorExpressionNode } from "../src/nodes/expressions/constructor";
import { AssignmentNode } from "../src/nodes/statements/assignment";

test("custom errors", () => {
    const { db, placeholders, feedback } = compileTest("custom-errors.wipple");

    testTypes(placeholders[2], ["Number"]);
    testTypes(placeholders[3], ["String"]);
    testTypes(placeholders[4], []);
    testTypes(placeholders[5], []);

    const addConstructor1 = Iterator.from(db)
        .filter(nodeFilter([{ line: placeholders[4].span.start.line }]))
        .find((node) => node instanceof ConstructorExpressionNode)!;

    expect(feedback.get(addConstructor1)).toContain("error-instance");

    const addConstructor2 = Iterator.from(db)
        .filter(nodeFilter([{ line: placeholders[5].span.start.line }]))
        .find((node) => node instanceof ConstructorExpressionNode)!;

    expect(feedback.get(addConstructor2)).toContain("error-instance");
});
