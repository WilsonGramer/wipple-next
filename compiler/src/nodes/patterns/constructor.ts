import { type Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { MarkerConstructorDefinition, VariantConstructorDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";

export class ConstructorPatternNode extends PatternNode {
    constructorName: string;
    elements: PatternNode[];

    private matchingConstructor?:
        | { type: "marker" }
        | { type: "variant"; index: number; elements: Node[] };

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
            this.matchingConstructor = {
                type: "variant",
                index: definition.index,
                elements: this.elements.map((pattern) => {
                    const elementNode = new InternalNode(pattern.span);
                    visitor.db.register(elementNode);

                    visitor.matching(elementNode, () => {
                        visitor.visit(pattern);
                    });

                    return elementNode;
                }),
            };

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

    codegen(codegen: Codegen): void {
        if (this.matchingConstructor == null) {
            codegen.fail();
        }

        switch (this.matchingConstructor.type) {
            case "marker": {
                // No code needed
                break;
            }
            case "variant": {
                const { index, elements } = this.matchingConstructor;

                codegen.write(
                    ` && (`,
                    codegen.node(this.matching),
                    `[runtime.variant] === ${index})`,
                );

                elements.forEach((element, index) => {
                    codegen.write(
                        ` && ((`,
                        codegen.node(this),
                        ` = `,
                        codegen.node(this.matching),
                        `[${index}]) || true)`,
                        element,
                    );
                });

                break;
            }
            default: {
                this.matchingConstructor satisfies never;
            }
        }
    }
}
