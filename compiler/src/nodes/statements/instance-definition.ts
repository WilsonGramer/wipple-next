import type { InstanceAttributes } from "../../visit/attributes";
import { parseInstanceAttributes } from "../../visit/attributes";
import type { Visitor } from "../../visit";
import { Instances } from "../../visit";
import type { Span } from "../../span";
import type { AttributeNode } from "../attributes";
import type { ConstraintNode } from "../constraints";
import type { BoundConstraintNode } from "../constraints/bound";
import type { ExpressionNode } from "../expressions";
import { StatementNode } from "./index";
import type { TypeParameterNode } from "../types/parameter";
import type { Type } from "../../typecheck";
import { InstanceDefinition, TraitDefinition } from "../../visit/definitions";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { TraitDefinitionNode } from "./trait-definition";
import type { Codegen } from "../../codegen";

export class InstanceDefinitionNode extends StatementNode {
    attributes: InstanceAttributes;
    bound: BoundConstraintNode;
    constraints: ConstraintNode[];
    value: ExpressionNode | undefined;

    constructor(
        comments: string[],
        attributes: AttributeNode[],
        bound: BoundConstraintNode,
        constraints: ConstraintNode[],
        value: ExpressionNode | undefined,
        span: Span,
    ) {
        super(comments, span);
        this.attributes = parseInstanceAttributes(attributes);
        this.bound = bound;
        this.constraints = constraints;
        this.value = value;
    }

    *children() {
        yield this.bound;
        yield* this.constraints;
        if (this.value != null) {
            yield this.value;
        }
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.defining(this, () => {
            visitor.pushScope();

            let trait: TraitDefinitionNode | undefined;
            let substitutions: Map<TypeParameterNode, Type> | undefined;
            visitor.enqueue("afterTypeDefinitions", () => {
                const traitDefinition = visitor.resolve(this.bound.trait, [TraitDefinition], this);
                if (traitDefinition == null) {
                    return;
                }

                trait = traitDefinition.node;

                visitor.currentDefinition!.withImplicitTypeParameters(() => {
                    for (const parameter of this.bound.parameters) {
                        visitor.visit(parameter);
                    }

                    // TODO: Ensure `parameters` has the right length
                    substitutions = new Map(
                        traitDefinition.parameters.map((parameter, index) => [
                            parameter,
                            this.bound.parameters[index],
                        ]),
                    );

                    for (const constraint of this.constraints) {
                        visitor.visit(constraint);
                    }

                    visitor.constraint(
                        new InstantiateConstraint({
                            source: this,
                            definition: traitDefinition.node,
                            replacements: new Map([[traitDefinition.node, this]]),
                            substitutions,
                        }),
                    );
                });
            });

            visitor.enqueue("afterAllDefinitions", () => {
                if (!trait || !substitutions) {
                    return;
                }

                if (this.value != null) {
                    visitor.currentDefinition!.withinConstantValue = true;

                    visitor.visit(this.value);
                    visitor.constraint(new GroupConstraint(this.value, this));
                } else if (this.attributes.error == null) {
                    // TODO: Missing instance value
                }

                trait.facts.getOr(Instances, []).push({
                    node: this,
                    trait,
                    substitutions,
                    default: this.attributes.default,
                    error: this.attributes.error,
                });

                visitor.instance(trait, definition);
            });

            visitor.popScope();

            const definition = new InstanceDefinition(
                this,
                this.comments,
                this.attributes,
                this.value,
            );

            return definition;
        });
    }

    codegen(_codegen: Codegen): void {
        // Handled specially in `Codegen`
    }
}
