import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { VariableDefinition } from "../../visit/definitions";
import type { Codegen } from "../../codegen";

export class VariablePatternNode extends PatternNode {
    variable: string;

    constructor(variable: string, span: Span) {
        super(span);
        this.variable = variable;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.define(this.variable, new VariableDefinition(this, visitor.currentMatch));
    }

    codegen(codegen: Codegen): void {
        codegen.write(
            this.span,
            ` && ((`,
            codegen.node(this),
            ` = `,
            codegen.node(this.matching),
            `) || true)`,
        );
    }

    *temporaries() {
        yield this;
    }
}
