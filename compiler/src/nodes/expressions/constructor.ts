import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import {
    MarkerConstructorDefinition,
    TraitDefinition,
    VariantConstructorDefinition,
    type Definition,
} from "../../visit/definitions";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import type { Type } from "../../typecheck";
import type { TypeParameterNode } from "../types/parameter";
import type { Codegen } from "../../codegen";

export class ConstructorExpressionNode extends ExpressionNode {
    constructorName: string;

    matchingConstructorDefinition?: Definition;
    matchingSubstitutions?: Map<TypeParameterNode, Type>;

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

        this.matchingConstructorDefinition = constructorDefinition;
    }

    codegen(codegen: Codegen): void {
        if (this.matchingConstructorDefinition == null) {
            codegen.fail();
        }

        if (this.matchingConstructorDefinition instanceof MarkerConstructorDefinition) {
            codegen.write("null");
        } else if (this.matchingConstructorDefinition instanceof TraitDefinition) {
            if (this.matchingSubstitutions == null) {
                codegen.fail();
            }

            codegen.write(
                `await runtime.trait(${codegen.node(
                    this.matchingConstructorDefinition.node,
                )}, types, {`,
            );

            this.matchingSubstitutions.forEach((type, parameter) => {
                codegen.write(`${codegen.node(parameter)}: `);
                codegen.writeType(type);
                codegen.write(", ");
            });

            codegen.write("})");
        } else {
            codegen.write(this.matchingConstructorDefinition.node);
        }
    }
}
