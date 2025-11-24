import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";

export class UnitPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.tuple([])));
    }

    codegen(_codegen: Codegen): void {
        // No code needed
    }
}
