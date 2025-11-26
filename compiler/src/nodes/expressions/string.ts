import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { NamedTypeNode } from "../types/named";
import type { Node } from "../../node";

export class StringExpressionNode extends ExpressionNode {
    value: string;

    constructor(value: string, span: Span) {
        super(span);
        this.value = value;
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const stringType = new NamedTypeNode("String", [], this.span);
        visitor.visit(stringType);

        visitor.constraint(new GroupConstraint(this, stringType));
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, JSON.stringify(this.value));
    }
}
