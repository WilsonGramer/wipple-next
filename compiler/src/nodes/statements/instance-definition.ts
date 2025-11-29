import type { Codegen } from "../../codegen";
import { Fact } from "../../db";
import type { Node } from "../../node";
import type { Span } from "../../span";
import type { Type } from "../../typecheck";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { zipNodes } from "../../util/zip";
import type { Visitor } from "../../visit";
import { Instances } from "../../visit";
import type { InstanceAttributes } from "../../visit/attributes";
import { parseInstanceAttributes } from "../../visit/attributes";
import { InstanceDefinition, TraitDefinition } from "../../visit/definitions";
import type { AttributeNode } from "../attributes";
import type { ConstraintNode } from "../constraints";
import type { BoundConstraintNode } from "../constraints/bound";
import type { ExpressionNode } from "../expressions";
import { ExtraType, MissingType } from "../types";
import { type TypeParameterNode } from "../types/parameter";
import { StatementNode } from "./index";
import type { TraitDefinitionNode } from "./trait-definition";

export class MissingInstanceValue extends Fact<null> {
    display(): string {
        return "is missing instance value";
    }
}

export class ExtraInstanceValue extends Fact<null> {
    display(): string {
        return "is extra instance value";
    }
}

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

    *children(): Generator<Node> {
        yield this.bound;
        yield* this.constraints;
        if (this.value != null) {
            yield this.value;
        }
    }

    visit(visitor: Visitor): void {
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

                    substitutions = new Map(
                        zipNodes(traitDefinition.parameters, this.bound.parameters, {
                            missing: MissingType,
                            extra: ExtraType,
                        }),
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

                    if (this.attributes.error) {
                        this.facts.set(ExtraInstanceValue, null);
                    }
                } else if (!this.attributes.error) {
                    this.facts.set(MissingInstanceValue, null);
                }

                definition.trait = trait;

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
