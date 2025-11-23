import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { VariableExpressionNode } from "./variable";
import { ConstantDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class CallExpressionNode extends ExpressionNode {
    function: ExpressionNode;
    inputs: ExpressionNode[];

    constructor(func: ExpressionNode, inputs: ExpressionNode[], span: Span) {
        super(span);
        this.function = func;
        this.inputs = inputs;
    }

    *children() {
        yield this.function;
        yield* this.inputs;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        if (this.inputs.length === 1) {
            const [unit] = this.inputs;

            if (unit instanceof VariableExpressionNode) {
                const unitDefinition = visitor.peek(unit.variable, [ConstantDefinition]);

                if (unitDefinition?.attributes.unit) {
                    visitor.visit(unit);
                    const unitNode = unit;
                    visitor.visit(this.function);
                    const input = this.function;

                    visitor.constraint(new TypeConstraint(unitNode, types.function([input], this)));

                    return;
                }
            }
        }

        visitor.visit(this.function);
        for (const input of this.inputs) {
            visitor.visit(input);
        }

        visitor.constraint(new TypeConstraint(this.function, types.function(this.inputs, this)));
    }
}
