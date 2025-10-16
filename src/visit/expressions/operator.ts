import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { OperatorExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";
import { BoundConstraint, InstantiateConstraint, TypeConstraint, types } from "../../typecheck";

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

            const substitutions = new Map<Node, Node>();

            operatorNode.setCodegen(codegen.traitExpression(definition.node, substitutions));

            visitor.addConstraints(
                new InstantiateConstraint({
                    source: operatorNode,
                    definition: definition.node,
                    substitutions,
                    replacements: new Map([[definition.node, operatorNode]]),
                }),
                new BoundConstraint(operatorNode, {
                    source: operatorNode,
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

const operatorTraits: Record<OperatorExpression["operator"], string> = {
    to: "To",
    by: "By",
    "^": "Power",
    "*": "Multiply",
    "/": "Divide",
    "%": "Remainder",
    "+": "Add",
    "-": "Subtract",
    "<": "Less-Than",
    "<=": "Less-Than-Or-Equal",
    ">": "Greater-Than",
    ">=": "Greater-Than-Or-Equal",
    "=": "Equal",
    "/=": "Not-Equal",
    and: "And",
    or: "Or",
    ".": "Apply",
};
