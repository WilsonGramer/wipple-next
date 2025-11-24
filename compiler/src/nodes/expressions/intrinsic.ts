import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";

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

    codegen(codegen: Codegen): void {
        codegen.write(`await runtime[${JSON.stringify(this.name)}](`);

        for (const input of this.inputs) {
            codegen.write(input);
            codegen.write(", ");
        }

        codegen.write(")");
    }
}
