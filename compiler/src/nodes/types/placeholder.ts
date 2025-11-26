import type { Node } from "../../node";
import type { Span } from "../../span";
import type { Visitor } from "../../visit";
import { TypeNode } from "./index";

export class PlaceholderTypeNode extends TypeNode {
    constructor(span: Span) {
        super(span);
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }
}
