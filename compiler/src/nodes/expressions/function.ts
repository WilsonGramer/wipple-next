import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import type { PatternNode } from "../patterns";
import { ExpressionNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { InternalNode } from "../../node";

export class FunctionExpressionNode extends ExpressionNode {
    inputs: PatternNode[];
    output: ExpressionNode;

    constructor(inputs: PatternNode[], output: ExpressionNode, span: Span) {
        super(span);
        this.inputs = inputs;
        this.output = output;
    }

    *children() {
        yield* this.inputs;
        yield this.output;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.pushScope();

        for (const pattern of this.inputs) {
            const inputNode = new InternalNode(pattern.span);
            visitor.db.register(inputNode);

            visitor.matching(inputNode, () => {
                visitor.visit(pattern);
            });
        }

        visitor.visit(this.output);

        visitor.popScope();

        visitor.constraint(new TypeConstraint(this, types.function(this.inputs, this.output)));
    }
}
