import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { VariableDefinition } from "../../visit/definitions";

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
}
