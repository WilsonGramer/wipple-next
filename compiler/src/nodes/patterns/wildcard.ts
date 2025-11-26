import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import type { Codegen } from "../../codegen";
import type { Node } from "../../node";

export class WildcardPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }

    codegen(_codegen: Codegen): void {
        // No code needed
    }

    *temporaries() {}
}
