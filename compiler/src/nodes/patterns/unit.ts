import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class UnitPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.unit()));
    }
}
