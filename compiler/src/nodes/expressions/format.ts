import type { Codegen } from "../../codegen";
import { Fact } from "../../db";
import { type Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { zip, zipNodes } from "../../util";
import type { Visitor } from "../../visit";
import { NamedTypeNode } from "../types/named";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import { ExpressionNode } from "./index";

export class MissingFormatInputs extends Fact<number> {
    display(count: number): string {
        return `is missing ${count} format inputs`;
    }
}

export class ExtraFormatInput extends Fact<null> {
    display(): string {
        return "is extra format input";
    }
}

export class FormatExpressionNode extends ExpressionNode {
    string: string;
    inputs: ExpressionNode[];

    private segments: [string, [Node, Node]][] = [];
    private trailing = "";

    constructor(string: string, inputs: ExpressionNode[], span: Span) {
        super(span);
        this.string = string;
        this.inputs = inputs;
    }

    *children(): Generator<Node> {
        yield* this.inputs;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const segmentStrings = this.string.split("_");
        this.trailing = segmentStrings.pop() ?? "";

        const stringType = new NamedTypeNode("String", [], this.span);
        visitor.visit(stringType);

        visitor.constraint(new GroupConstraint(this, stringType));

        let missingCount = 0;
        const segments = zip(segmentStrings, this.inputs, {
            onmissing: () => {
                missingCount += 1;
                return undefined;
            },
            onextra: zipNodes.onextra(ExtraFormatInput),
        });

        for (const [segment, input] of segments) {
            if (input != null) {
                visitor.visit(input);

                const describeTrait = new ConstructorExpressionNode("Describe", this.span);
                visitor.visit(describeTrait);
                visitor.constraint(
                    new TypeConstraint(describeTrait, types.function([input], stringType)),
                );

                this.segments.push([segment, [describeTrait, input]]);
            }
        }
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, '(""');

        for (const [segment, [describeFunction, input]] of this.segments) {
            codegen.write(
                this.span,
                ` + ${JSON.stringify(segment)} + `,
                new CallExpressionNode(describeFunction, [input], this.span),
            );
        }

        codegen.write(this.span, ` + ${JSON.stringify(this.trailing)})`);
    }
}
