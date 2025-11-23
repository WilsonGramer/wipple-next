import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";

export class FormatExpressionNode extends ExpressionNode {
    string: string;
    inputs: ExpressionNode[];

    constructor(string: string, inputs: ExpressionNode[], span: Span) {
        super(span);
        this.string = string;
        this.inputs = inputs;
    }

    *children() {
        yield* this.inputs;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const input of this.inputs) {
            visitor.visit(input); // TODO: Wrap in `Describe`
        }
    }
}
