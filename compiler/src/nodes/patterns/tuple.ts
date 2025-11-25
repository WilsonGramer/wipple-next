import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";
import type { Node } from "../../node";

export class TuplePatternNode extends PatternNode {
    elements: PatternNode[];

    private elementTemporaries?: Node[];

    constructor(elements: PatternNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children() {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        this.elementTemporaries = this.elements.map((pattern) => visitor.subpattern(pattern));

        visitor.constraint(new TypeConstraint(this, types.tuple(this.elements)));
    }

    codegen(codegen: Codegen): void {
        if (this.elementTemporaries == null) {
            codegen.fail();
        }

        this.elementTemporaries.forEach((element, index) => {
            codegen.write(
                this.span,
                ` && ((`,
                codegen.node(element),
                ` = `,
                codegen.node(this.matching),
                `[${index}]) || true)`,
                this.elements[index],
            );
        });
    }

    *temporaries() {
        if (this.elementTemporaries != null) {
            for (const element of this.elementTemporaries) {
                yield element;
            }
        }

        for (const element of this.elements) {
            yield* element.temporaries();
        }
    }
}
