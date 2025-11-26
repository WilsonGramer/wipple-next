import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import { VariableDefinition } from "../../visit/definitions";
import type { VariableExpressionNode } from "../expressions/variable";
import { PatternNode } from "./index";

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
