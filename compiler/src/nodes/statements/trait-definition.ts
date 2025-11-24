import type { Span } from "../../span";
import type { AttributeNode } from "../attributes";
import type { ConstraintNode } from "../constraints";
import { StatementNode } from "./index";
import type { TypeNode } from "../types";
import type { TraitAttributes } from "../../visit/attributes";
import { parseTraitAttributes } from "../../visit/attributes";
import type { TypeParameterNode } from "../types/parameter";
import type { Visitor } from "../../visit";
import { TraitDefinition } from "../../visit/definitions";
import { types } from "../../typecheck";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import type { Node } from "../../node";
import type { Codegen } from "../../codegen";

export class TraitDefinitionNode extends StatementNode {
    attributes: TraitAttributes;
    name: string;
    parameters: TypeParameterNode[];
    type: TypeNode;
    constraints: ConstraintNode[];

    constructor(
        comments: string[],
        attributes: AttributeNode[],
        name: string,
        parameters: TypeParameterNode[],
        type: TypeNode,
        constraints: ConstraintNode[],
        span: Span,
    ) {
        super(comments, span);
        this.attributes = parseTraitAttributes(attributes);
        this.name = name;
        this.parameters = parameters;
        this.type = type;
        this.constraints = constraints;
    }

    *children() {
        yield* this.parameters;
        yield this.type;
        yield* this.constraints;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.defining(this, () => {
            visitor.pushScope();

            visitor.currentDefinition!.withImplicitTypeParameters(() => {
                for (const parameter of this.parameters) {
                    visitor.visit(parameter);
                }
            });

            visitor.enqueue("afterAllDefinitions", () => {
                visitor.visit(this.type);

                visitor.constraint(new GroupConstraint(this, this.type));

                for (const constraint of this.constraints) {
                    visitor.visit(constraint);
                }

                // The bound for this trait is added where needed
            });

            visitor.popScope();

            const definition = new TraitDefinition(
                this,
                this.comments,
                this.attributes,
                this.parameters,
            );

            visitor.define(this.name, definition);

            return definition;
        });
    }

    codegen(_codegen: Codegen): void {
        // Handled specially in `Codegen`
    }
}
