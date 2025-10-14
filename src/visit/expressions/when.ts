import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { WhenExpression } from "../../syntax";
import { visitExpression } from ".";
import { TypeConstraint, types } from "../../typecheck";
import * as codegen from "../../codegen";
import { visitPattern } from "../patterns";

export class IsWhenExpression extends Fact<null> {}
export class InputInWhenExpression extends Fact<Node> {}
export class PatternInWhenExpression extends Fact<Node> {}
export class ValueInWhenExpression extends Fact<Node> {}

export const visitWhenExpression: Visit<WhenExpression> = (visitor, expression, node) => {
    const input = visitor.visit(expression.input, InputInWhenExpression, visitExpression);

    const variables: Node[] = [];
    const temporaries: Node[] = [];
    const branches = expression.arms.map((arm) => {
        visitor.pushScope();

        const [pattern, { conditions, temporaries }] = visitor.withMatchValue(input, () =>
            visitor.visit(arm.pattern, PatternInWhenExpression, visitPattern),
        );

        const value = visitor.visit(arm.value, ValueInWhenExpression, visitExpression);

        const { variables: armVariables = [] } = visitor.popScope();
        variables.push(...armVariables, ...temporaries);

        visitor.addConstraints(new TypeConstraint(pattern, input));
        visitor.addConstraints(new TypeConstraint(value, node));

        return { conditions, value };
    });

    visitor.db.add(node, new IsWhenExpression(null));

    node.setCodegen(
        codegen.callExpression(
            codegen.functionExpression([], variables, [
                codegen.temporaryStatement(input, input),
                ...branches.map(({ conditions, value }) =>
                    codegen.ifStatement(conditions, [codegen.returnStatement(value)]),
                ),
            ]),
            [],
        ),
    );
};
