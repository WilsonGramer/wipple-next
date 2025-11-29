import type { Codegen } from "../../codegen";
import { Fact } from "../../db";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import type { ConstantAttributes } from "../../visit/attributes";
import { parseConstantAttributes } from "../../visit/attributes";
import { ConstantDefinition } from "../../visit/definitions";
import type { AttributeNode } from "../attributes";
import type { ConstraintNode } from "../constraints";
import type { TypeNode } from "../types";
import { StatementNode } from "./index";

export class MissingConstantValue extends Fact<null> {
    display(): string {
        return "is missing constant value";
    }
}

export class ConstantDefinitionNode extends StatementNode {
    attributes: ConstantAttributes;
    name: string;
    type: TypeNode;
    constraints: ConstraintNode[];

    constructor(
        comments: string[],
        attributes: AttributeNode[],
        name: string,
        type: TypeNode,
        constraints: ConstraintNode[],
        span: Span,
    ) {
        super(comments, span);
        this.attributes = parseConstantAttributes(attributes);
        this.name = name;
        this.type = type;
        this.constraints = constraints;
    }

    *children(): Generator<Node> {
        yield this.type;
        yield* this.constraints;
    }

    visit(visitor: Visitor): void {
        visitor.defining(this, () => {
            visitor.pushScope();

            visitor.enqueue("afterTypeDefinitions", () => {
                visitor.currentDefinition!.withImplicitTypeParameters(() => {
                    visitor.visit(this.type);

                    for (const constraint of this.constraints) {
                        visitor.visit(constraint);
                    }
                });

                visitor.constraint(new GroupConstraint(this, this.type));
            });

            visitor.popScope();

            const definition = new ConstantDefinition(
                this,
                this.comments,
                this.attributes,
                this.type,
            );

            visitor.define(this.name, definition);

            visitor.enqueue("afterAllExpressions", () => {
                if (!definition.value.assigned) {
                    this.facts.set(MissingConstantValue, null);
                }
            });

            return definition;
        });
    }

    codegen(_codegen: Codegen): void {
        // Handled specially in `Codegen`
    }
}
