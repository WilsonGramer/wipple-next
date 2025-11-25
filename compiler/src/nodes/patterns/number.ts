import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { PatternNode } from "./index";
import type { Codegen } from "../../codegen";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { NamedTypeNode } from "../types/named";

export class NumberPatternNode extends PatternNode {
    value: string;

    constructor(value: string, span: Span) {
        super(span);
        this.value = value;
    }

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
