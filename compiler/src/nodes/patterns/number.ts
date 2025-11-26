import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import { NamedTypeNode } from "../types/named";
import { PatternNode } from "./index";

export class NumberPatternNode extends PatternNode {
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
        codegen.write(this.span, ` && (`, codegen.node(this.matching), `=== ${this.value})`);
    }

    *temporaries() {}
}
