import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";

export class IntrinsicExpressionNode extends ExpressionNode {
    name: string;
    inputs: ExpressionNode[];

    constructor(name: string, inputs: ExpressionNode[], span: Span) {
        super(span);
        this.name = name;
        this.inputs = inputs;
    }

    *children() {
        yield* this.inputs;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const input of this.inputs) {
            visitor.visit(input);
        }
    }
}
