import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { FunctionExpression } from "../../syntax";
import { visitExpression } from ".";
import { TypeConstraint, types } from "../../typecheck";
import { visitPattern } from "../patterns";
import * as codegen from "../../codegen";

export class IsFunctionExpression extends Fact<null> {}
export class InputInFunctionExpression extends Fact<Node> {}
export class OutputInFunctionExpression extends Fact<Node> {}

export const visitFunctionExpression: Visit<FunctionExpression> = (visitor, expression, node) => {
    visitor.pushScope();

    const conditions: codegen.CodegenItem[] = [];
    const temporaries: Node[] = [];
    const inputs = expression.inputs.map((pattern) => {
        const inputNode = visitor.node(pattern);

        const [_input, { conditions: inputConditions, temporaries: inputTemporaries }] =
            visitor.withMatchValue(inputNode, () =>
                visitor.visit(pattern, InputInFunctionExpression, visitPattern),
            );

        conditions.push(...inputConditions);
        temporaries.push(...inputTemporaries);

        return inputNode;
    });

    const output = visitor.visit(expression.output, OutputInFunctionExpression, visitExpression);

    const { variables = [] } = visitor.popScope();
    variables.push(...temporaries);

    visitor.db.add(node, new IsFunctionExpression(null));
    visitor.addConstraints(new TypeConstraint(node, types.function(inputs, output)));

    node.setCodegen(
        codegen.functionExpression(inputs, variables, [
            codegen.ifStatement(conditions, []),
            output,
        ]),
    );
};
