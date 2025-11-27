import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import { ExpressionStatementNode } from "../statements/expression";
import { BlockExpressionNode } from "./block";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import { ExpressionNode } from "./index";

export class OperatorExpressionNode extends ExpressionNode {
    operator: string;
    left: ExpressionNode;
    right: ExpressionNode;

    private operatorNode?: Node;

    constructor(operator: string, left: ExpressionNode, right: ExpressionNode, span: Span) {
        super(span);
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    *children(): Generator<Node> {
        yield this.left;
        yield this.right;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.left);
        visitor.visit(this.right);

        if (!(this.operator in operators)) {
            throw new Error(`unknown operator: ${this.operator}`);
        }

        this.operatorNode = operators[this.operator](visitor, this, this.left, this.right);
    }

    codegen(codegen: Codegen): void {
        if (this.operatorNode == null) {
            codegen.fail();
        }

        codegen.write(this.span, this.operatorNode);
    }
}

const resolveOperatorTrait = (visitor: Visitor, node: Node, name: string) => {
    const operatorNode = new ConstructorExpressionNode(name, node.span);
    visitor.visit(operatorNode);
    return operatorNode;
};

type VisitOperator = (visitor: Visitor, node: Node, left: Node, right: Node) => Node | undefined;

const traitOperator =
    (trait: string): VisitOperator =>
    (visitor, node, left, right) => {
        const operatorNode = resolveOperatorTrait(visitor, node, trait);
        if (operatorNode == null) {
            return undefined;
        }

        visitor.constraint(new TypeConstraint(operatorNode, types.function([left, right], node)));

        return new CallExpressionNode(operatorNode, [left, right], node.span);
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

        return new CallExpressionNode(
            operatorNode,
            [
                left,
                new BlockExpressionNode(
                    [new ExpressionStatementNode([], [], right, right.span)],
                    right.span,
                ),
            ],
            node.span,
        );
    };

const applyOperator: VisitOperator = (visitor, node, left, right) => {
    visitor.constraint(new TypeConstraint(right, types.function([left], node)));

    return new CallExpressionNode(right, [left], node.span);
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
