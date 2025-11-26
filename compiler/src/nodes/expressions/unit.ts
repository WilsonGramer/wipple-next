import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";
import { TupleExpressionNode } from "./tuple";
import type { Node } from "../../node";

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
