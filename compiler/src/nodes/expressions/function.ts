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

    *children() {
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

        codegen.write("(async (");

        for (const temporary of this.inputTemporaries) {
            codegen.write(codegen.node(temporary), ", ");
        }

        codegen.write(") => {\n");

        const variables = Iterator.from(this.inputs)
            .flatMap((input) => input.traverse())
            .filter((node) => node instanceof VariablePatternNode);

        for (const variable of variables) {
            codegen.write(`let ${codegen.node(variable)};\n`);
        }

        for (const pattern of this.inputs) {
            codegen.write("if (true", pattern, ") {}\n");
        }

        codegen.write("return ", this.output, ";\n})");
    }
}
