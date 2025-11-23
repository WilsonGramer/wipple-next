import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { VariableDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";

export class SetPatternNode extends PatternNode {
    variable: string;

    constructor(variable: string, span: Span) {
        super(span);
        this.variable = variable;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const variableDefinition = visitor.resolve(this.variable, [VariableDefinition], this);
        if (variableDefinition == null) {
            return;
        }

        visitor.constraint(new GroupConstraint(this, variableDefinition.node));
    }
}
