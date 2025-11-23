import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { MarkerConstructorDefinition, VariantConstructorDefinition } from "../../visit/definitions";
import { InternalNode } from "../../node";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class ConstructorPatternNode extends PatternNode {
    constructorName: string;
    elements: PatternNode[];

    constructor(constructorName: string, elements: PatternNode[], span: Span) {
        super(span);
        this.constructorName = constructorName;
        this.elements = elements;
    }

    *children() {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const definition = visitor.resolve(
            this.constructorName,
            [MarkerConstructorDefinition, VariantConstructorDefinition],
            this,
        );

        if (definition == null) {
            return;
        }

        // TODO: Ensure `elements` has the right length

        if (definition instanceof MarkerConstructorDefinition) {
            // No need to add a condition; markers only have one value

            visitor.constraint(
                new InstantiateConstraint({
                    source: this,
                    definition: definition.node,
                    substitutions: new Map(),
                    replacements: new Map([[definition.node, this]]),
                }),
            );
        } else if (definition instanceof VariantConstructorDefinition) {
            for (const pattern of this.elements) {
                const elementNode = new InternalNode(pattern.span);
                visitor.db.register(elementNode);

                visitor.matching(elementNode, () => {
                    visitor.visit(pattern);
                });
            }

            if (this.elements.length === 0) {
                visitor.constraint(
                    new InstantiateConstraint({
                        source: this,
                        definition: definition.node,
                        substitutions: new Map(),
                        replacements: new Map([[definition.node, this]]),
                    }),
                );
            } else {
                const constructorNode = new InternalNode(this.span);
                visitor.db.register(constructorNode);

                constructorNode.isHidden = true;

                visitor.constraint(
                    new InstantiateConstraint({
                        source: this,
                        definition: definition.node,
                        substitutions: new Map(),
                        replacements: new Map([[definition.node, constructorNode]]),
                    }),
                );

                visitor.constraint(
                    new TypeConstraint(constructorNode, types.function(this.elements, this)),
                );
            }
        } else {
            definition satisfies never;
        }
    }
}
