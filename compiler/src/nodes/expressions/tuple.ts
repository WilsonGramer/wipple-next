import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class TupleExpressionNode extends ExpressionNode {
    elements: ExpressionNode[];

    constructor(elements: ExpressionNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children() {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const element of this.elements) {
            visitor.visit(element);
        }
        visitor.constraint(new TypeConstraint(this, types.tuple(this.elements)));
    }
}
