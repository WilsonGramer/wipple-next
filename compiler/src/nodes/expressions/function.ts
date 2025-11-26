import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { type PatternNode } from "../patterns";
import { ExpressionNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";
import { VariablePatternNode } from "../patterns/variable";
import type { Node } from "../../node";

export class FunctionExpressionNode extends ExpressionNode {
    inputs: PatternNode[];
    output: ExpressionNode;

    inputTemporaries?: Node[];

    constructor(inputs: PatternNode[], output: ExpressionNode, span: Span) {
        super(span);
        this.inputs = inputs;
        this.output = output;
    }

    *children(): Generator<Node> {
        yield* this.inputs;
        yield this.output;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.pushScope();

        this.inputTemporaries = this.inputs.map((pattern) => visitor.subpattern(pattern));

        visitor.visit(this.output);

        visitor.popScope();

        visitor.constraint(new TypeConstraint(this, types.function(this.inputs, this.output)));
    }

    codegen(codegen: Codegen): void {
        if (this.inputTemporaries == null) {
            codegen.fail();
        }

        codegen.write(this.span, "(async (");

        for (const temporary of this.inputTemporaries) {
            codegen.write(this.span, codegen.node(temporary), ", ");
        }

        codegen.write(this.span, ") => {\n");

        for (const temporary of new Set(
            Iterator.from(this.inputs).flatMap((pattern) => pattern.temporaries()),
        )) {
            if (this.inputTemporaries.includes(temporary)) {
                continue;
            }

            codegen.write(this.span, `var ${codegen.node(temporary)};\n`);
        }

        for (const pattern of this.inputs) {
            codegen.write(
                this.span,
                "if (true",
                pattern,
                `) {} else { throw new Error("unreachable"); }\n`,
            );
        }

        codegen.write(this.span, "return ", this.output, ";\n})");
    }
}
