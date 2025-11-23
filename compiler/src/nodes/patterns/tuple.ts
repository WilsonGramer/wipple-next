import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { InternalNode } from "../../node";

export class TuplePatternNode extends PatternNode {
    elements: PatternNode[];

    constructor(elements: PatternNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children() {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const pattern of this.elements) {
            const elementNode = new InternalNode(pattern.span);
            visitor.db.register(elementNode);

            visitor.matching(elementNode, () => {
                visitor.visit(pattern);
            });
        }

        visitor.constraint(new TypeConstraint(this, types.tuple(this.elements)));
    }
}
