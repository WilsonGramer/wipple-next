import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { OperatorExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";
import { BoundConstraint, InstantiateConstraint, TypeConstraint, types } from "../../typecheck";
import { Type, TypeParameter } from "../../typecheck/constraints/type";

export class ResolvedOperatorExpression extends Fact<Node> {}
export class IsUnresolvedOperatorExpression extends Fact<null> {}
export class InputInOperatorExpression extends Fact<Node> {}

export const visitOperatorExpression: Visit<OperatorExpression> = (visitor, expression, node) => {
    const left = visitor.visit(expression.left, InputInOperatorExpression, visitExpression);
    const right = visitor.visit(expression.right, InputInOperatorExpression, visitExpression);

    const operatorNode = visitor.resolveName(
        operatorTraits[expression.operator],
        node,
        (definition) => {
            if (definition.type !== "trait") {
                return undefined;
            }

            const operatorNode = visitor.node(expression);

            const substitutions = new Map<TypeParameter, Type>();
            const replacements = new Map([[definition.node, operatorNode]]);

            operatorNode.setCodegen(codegen.traitExpression(definition.node, substitutions));

            visitor.addConstraints(
                new InstantiateConstraint({
                    source: operatorNode,
                    definition: definition.node,
                    substitutions,
                    replacements,
                }),
                new BoundConstraint(operatorNode, {
                    source: operatorNode,
                    definition: visitor.currentDefinition?.node,
                    trait: definition.node,
                    substitutions,
                }),
            );

            return [operatorNode, ResolvedOperatorExpression];
        },
    );

    if (operatorNode == null) {
        visitor.db.add(node, new IsUnresolvedOperatorExpression(null));
        return;
    }

    visitor.addConstraints(new TypeConstraint(operatorNode, types.function([left, right], node)));

    node.setCodegen(codegen.callExpression(operatorNode, [left, right]));
};

const operatorTraits: Record<string, string> = {
    toOperator: "To",
    byOperator: "By",
    powerOperator: "Power",
    multiplyOperator: "Multiply",
    divideOperator: "Divide",
    remainderOperator: "Remainder",
    addOperator: "Add",
    subtractOperator: "Subtract",
    lessThanOperator: "Less-Than",
    lessThanOrEqualOperator: "Less-Than-Or-Equal",
    greaterThanOperator: "Greater-Than",
    greaterThanOrEqualOperator: "Greater-Than-Or-Equal",
    equalOperator: "Equal",
    notEqualOperator: "Not-Equal",
    andOperator: "And",
    orOperator: "Or",
    applyOperator: "Apply",
};
