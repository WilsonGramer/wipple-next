import { Visit, Visitor } from "../visitor";
import { Fact, Node } from "../../db";
import { OperatorExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";
import { InstantiateConstraint, TypeConstraint, types } from "../../typecheck";
import { Type, TypeParameter } from "../../typecheck/constraints/type";

export class ResolvedOperatorExpression extends Fact<Node> {}
export class IsUnresolvedOperatorExpression extends Fact<null> {}
export class InputInOperatorExpression extends Fact<Node> {}

export const visitOperatorExpression: Visit<OperatorExpression> = (visitor, expression, node) => {
    const left = visitor.visit(expression.left, InputInOperatorExpression, visitExpression);
    const right = visitor.visit(expression.right, InputInOperatorExpression, visitExpression);

    operators[expression.operator](visitor, node, left, right);
};

const resolveOperatorTrait = (visitor: Visitor, node: Node, name: string) => {
    const operatorNode = visitor.resolveName(name, node, (definition) => {
        if (definition.type !== "trait") {
            return undefined;
        }

        const operatorNode = visitor.node({ location: node.span.range });

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

    return operatorNode;
};

type VisitOperator = (visitor: Visitor, node: Node, left: Node, right: Node) => void;

const traitOperator =
    (trait: string): VisitOperator =>
    (visitor, node, left, right) => {
        const operatorNode = resolveOperatorTrait(visitor, node, trait);
        if (operatorNode == null) {
            return;
        }

        visitor.addConstraints(
            new TypeConstraint(operatorNode, types.function([left, right], node)),
        );

        node.setCodegen(codegen.callExpression(operatorNode, [left, right]));
    };

const shortCircuitOperator =
    (trait: string): VisitOperator =>
    (visitor, node, left, right) => {
        const operatorNode = resolveOperatorTrait(visitor, node, trait);
        if (operatorNode == null) {
            return;
        }

        visitor.addConstraints(
            new TypeConstraint(operatorNode, types.function([left, types.block(right)], node)),
        );

        node.setCodegen(
            codegen.callExpression(operatorNode, [
                left,
                codegen.functionExpression([], [], [right]),
            ]),
        );
    };

const applyOperator: VisitOperator = (visitor, node, left, right) => {
    visitor.addConstraints(new TypeConstraint(right, types.function([left], node)));
    node.setCodegen(codegen.callExpression(right, [left]));
};

const operators: Record<string, VisitOperator> = {
    toOperator: traitOperator("To"),
    byOperator: traitOperator("By"),
    powerOperator: traitOperator("Power"),
    multiplyOperator: traitOperator("Multiply"),
    divideOperator: traitOperator("Divide"),
    remainderOperator: traitOperator("Remainder"),
    addOperator: traitOperator("Add"),
    subtractOperator: traitOperator("Subtract"),
    lessThanOperator: traitOperator("Less-Than"),
    lessThanOrEqualOperator: traitOperator("Less-Than-Or-Equal"),
    greaterThanOperator: traitOperator("Greater-Than"),
    greaterThanOrEqualOperator: traitOperator("Greater-Than-Or-Equal"),
    equalOperator: traitOperator("Equal"),
    notEqualOperator: traitOperator("Not-Equal"),
    andOperator: shortCircuitOperator("And"),
    orOperator: shortCircuitOperator("Or"),
    applyOperator,
};
