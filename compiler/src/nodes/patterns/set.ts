import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { VariableDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";
import type { Node } from "../../node";

export class SetPatternNode extends PatternNode {
    variable: string;

    private matchingVariable!: Node;

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

        this.matchingVariable = variableDefinition.node;
    }

    codegen(codegen: Codegen): void {
        if (this.matchingVariable == null) {
            codegen.fail();
        }

        codegen.write(
            `((`,
            codegen.node(this.matchingVariable),
            ` = `,
            codegen.node(this.matching),
            `) || true)`,
        );
    }
}
