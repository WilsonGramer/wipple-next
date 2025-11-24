import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { InternalPatternNode, type PatternNode } from "../patterns";
import { ExpressionNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { VariablePatternNode } from "../patterns/variable";

export class FunctionExpressionNode extends ExpressionNode {
    inputs: PatternNode[];
    output: ExpressionNode;

    inputTemporaries?: PatternNode[];

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

        this.inputTemporaries = this.inputs.map((pattern) => {
            const inputTemporary = new InternalPatternNode(pattern.span);
            visitor.db.register(inputTemporary);

            visitor.matching(inputTemporary, () => {
                visitor.visit(pattern);
            });

            return inputTemporary;
        });

        visitor.visit(this.output);

        visitor.popScope();

        visitor.constraint(new TypeConstraint(this, types.function(this.inputs, this.output)));
    }

    codegen(codegen: Codegen): void {
        if (this.inputTemporaries == null) {
            codegen.fail();
        }

        codegen.write("((");

        for (const temporary of this.inputTemporaries) {
            codegen.write(codegen.node(temporary), ", ");
        }

        codegen.write("}) => {\n");

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
