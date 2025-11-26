import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import { ExpressionNode } from "./index";
import { TupleExpressionNode } from "./tuple";

export class UnitExpressionNode extends ExpressionNode {
    constructor(span: Span) {
        super(span);
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.tuple([])));
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, new TupleExpressionNode([], this.span));
    }
}
