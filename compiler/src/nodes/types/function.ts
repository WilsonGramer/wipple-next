import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Node } from "../../node";

export class FunctionTypeNode extends TypeNode {
    inputs: TypeNode[];
    output: TypeNode;

    constructor(inputs: TypeNode[], output: TypeNode, span: Span) {
        super(span);
        this.inputs = inputs;
        this.output = output;
    }

    *children(): Generator<Node> {
        yield* this.inputs;
        yield this.output;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const input of this.inputs) {
            visitor.visit(input);
        }
        visitor.visit(this.output);
        visitor.constraint(new TypeConstraint(this, types.function(this.inputs, this.output)));
    }
}
