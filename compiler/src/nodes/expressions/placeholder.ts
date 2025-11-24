import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";

export class PlaceholderExpressionNode extends ExpressionNode {
    constructor(span: Span) {
        super(span);
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);
    }

    codegen(codegen: Codegen): void {
        codegen.fail();
    }
}
