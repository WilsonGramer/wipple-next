import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import type { Codegen } from "../../codegen";

export class WildcardPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }

    codegen(_codegen: Codegen): void {
        // No code needed
    }
}
