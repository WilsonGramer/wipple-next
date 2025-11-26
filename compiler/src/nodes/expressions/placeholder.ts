import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";
import type { Node } from "../../node";

export class PlaceholderExpressionNode extends ExpressionNode {
    constructor(span: Span) {
        super(span);
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }

    codegen(codegen: Codegen): void {
        codegen.fail();
    }
}
