import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";

export class WildcardPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }
}
