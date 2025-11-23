import type { Span } from "../../span";
import type { AttributeNode } from "../attributes";
import type { ConstraintNode } from "../constraints";
import { StatementNode } from "./index";
import type { TypeNode } from "../types";
import type { ConstantAttributes } from "../../visit/attributes";
import { parseConstantAttributes } from "../../visit/attributes";
import type { Visitor } from "../../visit";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { ConstantDefinition } from "../../visit/definitions";

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

    *children() {
        yield this.type;
        yield* this.constraints;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

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

            return definition;
        });
    }
}
