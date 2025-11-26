import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Node } from "../../node";

export class TupleTypeNode extends TypeNode {
    elements: TypeNode[];

    constructor(elements: TypeNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children(): Generator<Node> {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const element of this.elements) {
            visitor.visit(element);
        }

        visitor.constraint(new TypeConstraint(this, types.tuple(this.elements)));
    }
}
