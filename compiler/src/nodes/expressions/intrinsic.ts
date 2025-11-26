import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import type { Visitor } from "../../visit";
import { ExpressionNode } from "./index";

export class IntrinsicExpressionNode extends ExpressionNode {
    name: string;
    inputs: ExpressionNode[];

    constructor(name: string, inputs: ExpressionNode[], span: Span) {
        super(span);
        this.name = name;
        this.inputs = inputs;
    }

    *children(): Generator<Node> {
        yield* this.inputs;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const input of this.inputs) {
            visitor.visit(input);
        }
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, `await runtime[${JSON.stringify(this.name)}](`);

        for (const input of this.inputs) {
            codegen.write(this.span, input);
            codegen.write(this.span, ", ");
        }

        codegen.write(this.span, ")");
    }
}
