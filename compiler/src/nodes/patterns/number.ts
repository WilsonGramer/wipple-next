import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { PatternNode } from "./index";

export class NumberPatternNode extends PatternNode {
    value: string;

    constructor(value: string, span: Span) {
        super(span);
        this.value = value;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const numberTypeDefinition = visitor.resolve("Number", [TypeDefinition], this);
        if (numberTypeDefinition != null) {
            visitor.constraint(
                new TypeConstraint(this, types.named(numberTypeDefinition.node, [])),
            );
        }
    }
}
