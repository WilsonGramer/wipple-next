import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";

export class StringExpressionNode extends ExpressionNode {
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
                new InstantiateConstraint({
                    source: this,
                    definition: stringTypeDefinition.node,
                    substitutions: new Map(),
                    replacements: new Map([[stringTypeDefinition.node, this]]),
                }),
            );
        }
    }

    codegen(codegen: Codegen): void {
        codegen.write(JSON.stringify(this.value));
    }
}
