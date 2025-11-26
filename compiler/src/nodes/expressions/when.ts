import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { type PatternNode } from "../patterns";
import { ExpressionNode } from "./index";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";
import { VariablePatternNode } from "../patterns/variable";
import { InternalNode, type Node } from "../../node";

export class WhenExpressionNode extends ExpressionNode {
    input: ExpressionNode;
    arms: Arm[];

    inputTemporary?: InternalNode;

    constructor(input: ExpressionNode, arms: Arm[], span: Span) {
        super(span);
        this.input = input;
        this.arms = arms;
    }

    *children(): Generator<Node> {
        yield this.input;
        for (const arm of this.arms) {
            yield arm.pattern;
            yield arm.value;
        }
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.input);

        this.inputTemporary = new InternalNode(this.input.span);
        visitor.constraint(new GroupConstraint(this.inputTemporary, this.input));

        visitor.matching(this.inputTemporary, () => {
            for (const arm of this.arms) {
                visitor.pushScope();
                visitor.visit(arm.pattern);
                visitor.visit(arm.value);
                visitor.popScope();

                visitor.constraint(new GroupConstraint(arm.value, this));
            }
        });
    }

    codegen(codegen: Codegen): void {
        if (this.inputTemporary == null) {
            codegen.fail();
        }

        codegen.write(this.span, "await (async (", codegen.node(this.inputTemporary), ") => {\n");

        for (const temporary of new Set(
            Iterator.from(this.arms).flatMap((arm) => arm.pattern.temporaries()),
        )) {
            if (temporary === this.inputTemporary) {
                continue;
            }

            codegen.write(this.span, `var ${codegen.node(temporary)};\n`);
        }

        for (const arm of this.arms) {
            codegen.write(
                this.span,
                "if (true",
                arm.pattern,
                ") {\n",
                "return ",
                arm.value,
                ";\n}\n",
            );
        }

        codegen.write(this.span, `throw new Error("unreachable");\n`);

        codegen.write(this.span, "})(", this.input, ")");
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
