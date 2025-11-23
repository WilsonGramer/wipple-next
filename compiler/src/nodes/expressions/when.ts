import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import type { PatternNode } from "../patterns";
import { ExpressionNode } from "./index";
import { GroupConstraint } from "../../typecheck/constraints/group";

export class WhenExpressionNode extends ExpressionNode {
    input: ExpressionNode;
    arms: Arm[];

    constructor(input: ExpressionNode, arms: Arm[], span: Span) {
        super(span);
        this.input = input;
        this.arms = arms;
    }

    *children() {
        yield this.input;
        for (const arm of this.arms) {
            yield arm.pattern;
            yield arm.value;
        }
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.input);
        visitor.matching(this.input, () => {
            for (const arm of this.arms) {
                visitor.pushScope();
                visitor.visit(arm.pattern);
                visitor.visit(arm.value);
                visitor.popScope();

                visitor.constraint(new GroupConstraint(arm.value, this));
            }
        });
    }
}

export class Arm {
    span: Span;
    pattern: PatternNode;
    value: ExpressionNode;

    constructor(pattern: PatternNode, value: ExpressionNode, span: Span) {
        this.span = span;
        this.pattern = pattern;
        this.value = value;
    }
}
