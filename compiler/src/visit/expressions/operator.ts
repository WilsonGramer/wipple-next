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
    let right = visitor.visit(expression.right, InputInOperatorExpression, visitExpression);

    const operator = operators[expression.operator];

    const operatorNode = visitor.resolveName(operator.trait, node, (definition) => {
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
        );

        return [operatorNode, ResolvedOperatorExpression];
    });

    if (operatorNode == null) {
        visitor.db.add(node, new IsUnresolvedOperatorExpression(null));
        return;
    }

    if (operator.shortCircuit) {
        visitor.addConstraints(
            new TypeConstraint(operatorNode, types.function([left, types.block(right)], node)),
        );

        node.setCodegen(
            codegen.callExpression(operatorNode, [
                left,
                codegen.functionExpression([], [], [right]),
            ]),
        );
    } else {
        visitor.addConstraints(
            new TypeConstraint(operatorNode, types.function([left, right], node)),
        );

        node.setCodegen(codegen.callExpression(operatorNode, [left, right]));
    }
};

const operators: Record<string, { trait: string; shortCircuit?: boolean }> = {
    toOperator: { trait: "To" },
    byOperator: { trait: "By" },
    powerOperator: { trait: "Power" },
    multiplyOperator: { trait: "Multiply" },
    divideOperator: { trait: "Divide" },
    remainderOperator: { trait: "Remainder" },
    addOperator: { trait: "Add" },
    subtractOperator: { trait: "Subtract" },
    lessThanOperator: { trait: "Less-Than" },
    lessThanOrEqualOperator: { trait: "Less-Than-Or-Equal" },
    greaterThanOperator: { trait: "Greater-Than" },
    greaterThanOrEqualOperator: { trait: "Greater-Than-Or-Equal" },
    equalOperator: { trait: "Equal" },
    notEqualOperator: { trait: "Not-Equal" },
    andOperator: { trait: "And", shortCircuit: true },
    orOperator: { trait: "Or", shortCircuit: true },
    applyOperator: { trait: "Apply" },
};
