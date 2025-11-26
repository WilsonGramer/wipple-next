import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import { PatternNode } from "./index";

export class UnitPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.tuple([])));
    }

    *children(): Generator<Node> {}

    codegen(_codegen: Codegen): void {
        // No code needed
    }

    *temporaries() {}
}
