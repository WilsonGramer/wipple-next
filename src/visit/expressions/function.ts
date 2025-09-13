import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { FunctionExpression } from "../../syntax";
import { visitExpression } from ".";
import { TypeConstraint, types } from "../../typecheck";
import { visitPattern } from "../patterns";

export class IsFunctionExpression extends Fact<null> {}
export class InputInFunctionExpression extends Fact<Node> {}
export class OutputInFunctionExpression extends Fact<Node> {}

export const visitFunctionExpression: Visit<FunctionExpression> = (visitor, expression, node) => {
    visitor.pushScope();

    const inputs = expression.inputs.map((input) =>
        visitor.visit(input, InputInFunctionExpression, visitPattern),
    );

    const output = visitor.visit(expression.output, OutputInFunctionExpression, visitExpression);

    visitor.popScope();

    visitor.db.add(node, new IsFunctionExpression(null));
    visitor.addConstraints(new TypeConstraint(node, types.function(inputs, output)));
};
