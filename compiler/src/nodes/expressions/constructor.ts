import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import {
    MarkerConstructorDefinition,
    TraitDefinition,
    VariantConstructorDefinition,
} from "../../visit/definitions";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import { Node } from "../../node";
import type { Type } from "../../typecheck";
import type { TypeParameterNode } from "../types/parameter";

export class ConstructorExpressionNode extends ExpressionNode {
    constructorName: string;

    constructor(constructorName: string, span: Span) {
        super(span);
        this.constructorName = constructorName;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const constructorDefinition = visitor.resolve(
            this.constructorName,
            [TraitDefinition, VariantConstructorDefinition, MarkerConstructorDefinition],
            this,
        );

        if (constructorDefinition == null) {
            return;
        }

        const substitutions = new Map<TypeParameterNode, Type>();

        visitor.constraint(
            new InstantiateConstraint({
                source: this,
                definition: constructorDefinition.node,
                substitutions,
                replacements: new Map([[constructorDefinition.node, this]]),
            }),
        );

        if (constructorDefinition instanceof TraitDefinition) {
            visitor.constraint(
                new BoundConstraint(this, {
                    source: this,
                    trait: constructorDefinition.node,
                    substitutions,
                }),
            );
        }
    }
}
