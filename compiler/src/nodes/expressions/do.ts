import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class DoExpressionNode extends ExpressionNode {
    input: ExpressionNode;

    constructor(input: ExpressionNode, span: Span) {
        super(span);
        this.input = input;
    }

    *children() {
        yield this.input;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.input);
        visitor.constraint(new TypeConstraint(this.input, types.block(this)));
    }
}
