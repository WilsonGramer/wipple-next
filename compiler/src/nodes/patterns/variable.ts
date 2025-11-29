import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import type { Visitor } from "../../visit";
import { VariableDefinition } from "../../visit/definitions";
import { PatternNode } from "./index";

export class VariablePatternNode extends PatternNode {
    variable: string;

    constructor(variable: string, span: Span) {
        super(span);
        this.variable = variable;
    }

    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.define(this.variable, new VariableDefinition(this, visitor.currentMatch.node));
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
