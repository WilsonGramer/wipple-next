import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { Codegen } from "../../codegen";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { NamedTypeNode } from "../types/named";
import type { Node } from "../../node";

export class NumberExpressionNode extends ExpressionNode {
    value: string;

    constructor(value: string, span: Span) {
        super(span);
        this.value = value;
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const numberType = new NamedTypeNode("Number", [], this.span);
        visitor.visit(numberType);

        visitor.constraint(new GroupConstraint(this, numberType));
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, this.value);
    }
}
