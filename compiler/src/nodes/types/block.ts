import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import { TypeNode } from "./index";

export class BlockTypeNode extends TypeNode {
    output: TypeNode;

    constructor(output: TypeNode, span: Span) {
        super(span);
        this.output = output;
    }

    *children(): Generator<Node> {
        yield this.output;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.output);
        visitor.constraint(new TypeConstraint(this, types.block(this.output)));
    }
}
