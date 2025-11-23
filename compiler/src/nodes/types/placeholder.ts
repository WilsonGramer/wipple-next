import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";

export class PlaceholderTypeNode extends TypeNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }
}
