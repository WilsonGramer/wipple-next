import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";

export class NumberExpressionNode extends ExpressionNode {
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

    codegen(codegen: Codegen): void {
        codegen.write(this.value);
    }
}
