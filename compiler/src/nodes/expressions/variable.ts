import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { ConstantDefinition, VariableDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";

export class VariableExpressionNode extends ExpressionNode {
    variable: string;

    constructor(variable: string, span: Span) {
        super(span);
        this.variable = variable;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const definition = visitor.resolve(
            this.variable,
            [VariableDefinition, ConstantDefinition],
            this,
        );

        if (definition == null) {
            return;
        }

        if (definition instanceof VariableDefinition) {
            visitor.constraint(new GroupConstraint(this, definition.node));
        } else if (definition instanceof ConstantDefinition) {
            visitor.constraint(
                new InstantiateConstraint({
                    source: this,
                    definition: definition.node,
                    substitutions: new Map(),
                    replacements: new Map([[definition.node, this]]),
                }),
            );
        }
    }
}
