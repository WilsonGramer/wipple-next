import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { IsExpression } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import * as codegen from "../../codegen";
import { visitExpression } from ".";
import { visitPattern } from "../patterns";

export class ValueInIsExpression extends Fact<Node> {}
export class PatternInIsExpression extends Fact<Node> {}
export class ResolvedBooleanInIsExpression extends Fact<Node> {}
export class ResolvedTrueInIsExpression extends Fact<Node> {}
export class ResolvedFalseInIsExpression extends Fact<Node> {}
export class IsUnresolvedIsExpression extends Fact<null> {}

export const visitIsExpression: Visit<IsExpression> = (visitor, expression, node) => {
    const value = visitor.visit(expression.left, ValueInIsExpression, visitExpression);

    const [pattern, conditions] = visitor.withMatchValue(value, () =>
        visitor.visit(expression.right, PatternInIsExpression, visitPattern),
    );

    visitor.addConstraints(new TypeConstraint(pattern, value));

    const booleanType = visitor.resolveName("Boolean", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedBooleanInIsExpression];
    });

    const trueVariant = visitor.resolveName("True", node, (definition) => {
        if (definition.type !== "variantConstructor") {
            return undefined;
        }

        return [definition.index, ResolvedTrueInIsExpression];
    });

    const falseVariant = visitor.resolveName("False", node, (definition) => {
        if (definition.type !== "variantConstructor") {
            return undefined;
        }

        return [definition.index, ResolvedFalseInIsExpression];
    });

    if (booleanType == null || trueVariant == null || falseVariant == null) {
        visitor.db.add(node, new IsUnresolvedIsExpression(null));
        return;
    }

    visitor.addConstraints(new TypeConstraint(node, types.named(booleanType, [])));

    node.setCodegen(
        codegen.callExpression(
            codegen.functionExpression(
                [],
                [],
                [
                    codegen.temporaryStatement(value),
                    [
                        codegen.ifStatement(conditions, [
                            codegen.returnStatement(codegen.variantExpression(trueVariant, [])),
                        ]),
                        codegen.returnStatement(codegen.variantExpression(falseVariant, [])),
                    ],
                ],
            ),
            [],
        ),
    );
};
