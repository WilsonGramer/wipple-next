import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { Node } from "../../node";
import { InternalNode } from "../../node";
import { TraitDefinition } from "../../visit/definitions";
import type { TypeParameterNode } from "../types/parameter";
import type { Type } from "../../typecheck";
import { types } from "../../typecheck";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { BoundConstraint } from "../../typecheck/constraints/bound";

export class OperatorExpressionNode extends ExpressionNode {
    operator: string;
    left: ExpressionNode;
    right: ExpressionNode;

    constructor(operator: string, left: ExpressionNode, right: ExpressionNode, span: Span) {
        super(span);
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    *children() {
        yield this.left;
        yield this.right;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.left);
        visitor.visit(this.right);
        operators[this.operator](visitor, this, this.left, this.right);
    }
}

const resolveOperatorTrait = (visitor: Visitor, node: Node, name: string) => {
    const operatorNode = new InternalNode(node.span);
    visitor.db.register(operatorNode);

    const operatorDefinition = visitor.resolve(name, [TraitDefinition], operatorNode);
    if (operatorDefinition == null) {
        return;
    }

    const substitutions = new Map<TypeParameterNode, Type>();

    visitor.constraint(
        new InstantiateConstraint({
            source: operatorNode,
            definition: operatorDefinition.node,
            substitutions,
            replacements: new Map([[operatorDefinition.node, operatorNode]]),
        }),
    );

    visitor.constraint(
        new BoundConstraint(operatorNode, {
            source: operatorNode,
            trait: operatorDefinition.node,
            substitutions,
        }),
    );

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

        visitor.constraint(new TypeConstraint(operatorNode, types.function([left, right], node)));
    };

const shortCircuitOperator =
    (trait: string): VisitOperator =>
    (visitor, node, left, right) => {
        const operatorNode = resolveOperatorTrait(visitor, node, trait);
        if (operatorNode == null) {
            return;
        }

        visitor.constraint(
            new TypeConstraint(operatorNode, types.function([left, types.block(right)], node)),
        );
    };

const applyOperator: VisitOperator = (visitor, node, left, right) => {
    visitor.constraint(new TypeConstraint(right, types.function([left], node)));
};

const operators: Record<string, VisitOperator> = {
    to: traitOperator("To"),
    by: traitOperator("By"),
    "^": traitOperator("Power"),
    "*": traitOperator("Multiply"),
    "/": traitOperator("Divide"),
    "%": traitOperator("Remainder"),
    "+": traitOperator("Add"),
    "-": traitOperator("Subtract"),
    "<": traitOperator("Less-Than"),
    "<=": traitOperator("Less-Than-Or-Equal"),
    ">": traitOperator("Greater-Than"),
    ">=": traitOperator("Greater-Than-Or-Equal"),
    "=": traitOperator("Equal"),
    "/=": traitOperator("Not-Equal"),
    and: shortCircuitOperator("And"),
    or: shortCircuitOperator("Or"),
    ".": applyOperator,
};
