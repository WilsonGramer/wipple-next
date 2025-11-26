import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";
import type { Node } from "../../node";

export class PlaceholderTypeNode extends TypeNode {
    constructor(span: Span) {
        super(span);
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }
}
