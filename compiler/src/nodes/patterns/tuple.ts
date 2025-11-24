import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { InternalNode, type Node } from "../../node";
import type { Codegen } from "../../codegen";

export class TuplePatternNode extends PatternNode {
    elements: PatternNode[];

    private matchingElements?: Node[];

    constructor(elements: PatternNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children() {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        this.matchingElements = this.elements.map((pattern) => {
            const elementNode = new InternalNode(pattern.span);
            visitor.db.register(elementNode);

            visitor.matching(elementNode, () => {
                visitor.visit(pattern);
            });

            return elementNode;
        });

        visitor.constraint(new TypeConstraint(this, types.tuple(this.elements)));
    }

    codegen(codegen: Codegen): void {
        if (this.matchingElements == null) {
            codegen.fail();
        }

        this.matchingElements.forEach((element, index) => {
            codegen.write(
                ` && ((`,
                codegen.node(this),
                ` = `,
                codegen.node(this.matching),
                `[${index}]) || true)`,
                element,
            );
        });
    }
}
