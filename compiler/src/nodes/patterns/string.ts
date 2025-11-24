import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { PatternNode } from "./index";
import type { Codegen } from "../../codegen";

export class StringPatternNode extends PatternNode {
    value: string;

    constructor(value: string, span: Span) {
        super(span);
        this.value = value;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const stringTypeDefinition = visitor.resolve("String", [TypeDefinition], this);
        if (stringTypeDefinition != null) {
            visitor.constraint(
                new TypeConstraint(this, types.named(stringTypeDefinition.node, [])),
            );
        }
    }

    codegen(codegen: Codegen): void {
        codegen.write(` && (`, codegen.node(this.matching), `=== ${JSON.stringify(this.value)})`);
    }
}
