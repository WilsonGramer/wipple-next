import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { TypeNode } from "../types";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";
import type { Node } from "../../node";

export class AnnotateExpressionNode extends ExpressionNode {
    expression: ExpressionNode;
    type: TypeNode;

    constructor(expression: ExpressionNode, type: TypeNode, span: Span) {
        super(span);
        this.expression = expression;
        this.type = type;
    }

    *children(): Generator<Node> {
        yield this.expression;
        yield this.type;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        this.isHidden = true;
        visitor.visit(this.expression);
        visitor.visit(this.type);
        visitor.constraint(new GroupConstraint(this.expression, this.type));
        visitor.constraint(new GroupConstraint(this, this.expression));
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, this.expression);
    }
}
