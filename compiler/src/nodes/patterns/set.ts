import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { VariableDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";
import type { VariableExpressionNode } from "../expressions/variable";
import type { Node } from "../../node";

export class SetPatternNode extends PatternNode {
    variable: string;

    private matchingVariable!: VariableExpressionNode;

    constructor(variable: string, span: Span) {
        super(span);
        this.variable = variable;
    }

    *children(): Generator<Node> {}

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
            this.span,
            ` && ((`,
            codegen.node(this.matchingVariable),
            ` = `,
            codegen.node(this.matching),
            `) || true)`,
        );
    }

    *temporaries() {
        // Do NOT yield `this.matchingVariable`, that would shadow it!
    }
}
