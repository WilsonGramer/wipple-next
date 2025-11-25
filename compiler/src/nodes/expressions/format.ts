import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { type Node } from "../../node";
import type { Codegen } from "../../codegen";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import { NamedTypeNode } from "../types/named";
import { GroupConstraint } from "../../typecheck/constraints/group";

export class FormatExpressionNode extends ExpressionNode {
    string: string;
    inputs: ExpressionNode[];

    private segments?: [string, Node, Node][];
    private trailing?: string;

    constructor(string: string, inputs: ExpressionNode[], span: Span) {
        super(span);
        this.string = string;
        this.inputs = inputs;
    }

    *children() {
        yield* this.inputs;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const segments = this.string.split("_");
        const trailing = segments.pop() ?? "";

        const stringType = new NamedTypeNode("String", [], this.span);
        visitor.visit(stringType);

        visitor.constraint(new GroupConstraint(this, stringType));

        this.segments = [];
        this.trailing = trailing;
        this.inputs.forEach((input, index) => {
            visitor.visit(input);

            const describeTrait = new ConstructorExpressionNode("Describe", this.span);
            visitor.visit(describeTrait);
            visitor.constraint(
                new TypeConstraint(describeTrait, types.function([input], stringType)),
            );

            this.segments!.push([segments[index], describeTrait, input]);
        });
    }

    codegen(codegen: Codegen): void {
        if (this.segments == null) {
            codegen.fail();
        }

        codegen.write(this.span, '(""');

        for (const [segment, describeFunction, input] of this.segments) {
            codegen.write(
                this.span,
                ` + ${JSON.stringify(segment)} + `,
                new CallExpressionNode(describeFunction, [input], this.span),
            );
        }

        codegen.write(this.span, ` + ${JSON.stringify(this.trailing)})`);
    }
}
