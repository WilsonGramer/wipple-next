import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import type { Visitor } from "../../visit";
import { PatternNode } from "./index";

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
