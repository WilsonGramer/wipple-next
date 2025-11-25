import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { TraitDefinition, TypeDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";

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

        const describeTrait = visitor.resolve("Describe", [TraitDefinition], this);
        if (describeTrait == null) {
            return;
        }

        const stringTypeDefinition = visitor.resolve("String", [TypeDefinition], this);
        if (stringTypeDefinition == null) {
            return;
        }

        this.segments = [];
        this.trailing = trailing;
        this.inputs.forEach((input, index) => {
            visitor.visit(input); // TODO: Wrap in `Describe`

            const substitutions = new Map([[describeTrait.parameters[0], input]]);

            const describeFunction = new InternalNode(this.span, (codegen) => {
                const constructor = new ConstructorExpressionNode("Describe", this.span);

                constructor.matchingConstructorDefinition = describeTrait;
                constructor.matchingSubstitutions = substitutions;

                codegen.write(constructor);
            });

            visitor.db.register(describeFunction);

            this.segments!.push([segments[index], describeFunction, input]);

            visitor.constraint(
                new InstantiateConstraint({
                    source: describeFunction,
                    definition: describeTrait.node,
                    substitutions,
                    replacements: new Map<Node, Node>([[describeTrait.node, describeFunction]]),
                }),
            );

            visitor.constraint(
                new BoundConstraint(describeFunction, {
                    source: describeFunction,
                    trait: describeTrait.node,
                    substitutions,
                }),
            );

            visitor.constraint(
                new TypeConstraint(
                    describeFunction,
                    types.function([input], stringTypeDefinition.node),
                ),
            );
        });

        visitor.constraint(
            new InstantiateConstraint({
                source: this,
                definition: stringTypeDefinition.node,
                substitutions: new Map(),
                replacements: new Map([[stringTypeDefinition.node, this]]),
            }),
        );
    }

    codegen(codegen: Codegen): void {
        if (this.segments == null) {
            codegen.fail();
        }

        codegen.write('(""');

        for (const [segment, describeFunction, input] of this.segments) {
            codegen.write(
                ` + ${JSON.stringify(segment)} + `,
                new CallExpressionNode(describeFunction, [input], this.span),
            );
        }

        codegen.write(` + ${JSON.stringify(this.trailing)})`);
    }
}
