import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { PatternNode } from "./index";
import type { Codegen } from "../../codegen";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";

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
                new InstantiateConstraint({
                    source: this,
                    definition: numberTypeDefinition.node,
                    substitutions: new Map(),
                    replacements: new Map([[numberTypeDefinition.node, this]]),
                }),
            );
        }
    }

    codegen(codegen: Codegen): void {
        codegen.write(` && (`, codegen.node(this.matching), `=== ${this.value})`);
    }
}
