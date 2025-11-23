import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { TypeNode } from "../types";
import { GroupConstraint } from "../../typecheck/constraints/group";

export class AnnotateExpressionNode extends ExpressionNode {
    left: ExpressionNode;
    right: TypeNode;

    constructor(left: ExpressionNode, right: TypeNode, span: Span) {
        super(span);
        this.left = left;
        this.right = right;
    }

    *children() {
        yield this.left;
        yield this.right;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        this.isHidden = true;
        visitor.visit(this.left);
        visitor.visit(this.right);
        visitor.constraint(new GroupConstraint(this.left, this.right));
        visitor.constraint(new GroupConstraint(this, this.left));
    }
}
