import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import { TypeNode } from "./index";

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
