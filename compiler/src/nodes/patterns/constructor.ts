import { type Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { MarkerConstructorDefinition, VariantConstructorDefinition } from "../../visit/definitions";
import { fact, InternalNode, type Node } from "../../node";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Codegen } from "../../codegen";

export const MissingElement = fact("is missing element");
export const ExtraElement = fact("is extra element");
export const DuplicateElement = fact("is duplicate element");

export class ConstructorPatternNode extends PatternNode {
    constructorName: string;
    elements: PatternNode[];

    private matchingConstructor?:
        | { type: "marker" }
        | { type: "variant"; index: number; elements: (readonly [Node, PatternNode])[] };

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

        if (definition instanceof MarkerConstructorDefinition) {
            // No need to add a condition; markers only have one value

            for (const element of this.elements) {
                visitor.subpattern(element);
                element.facts.set(ExtraElement, null);
            }

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
                elements: this.elements.map(
                    (element) => [visitor.subpattern(element), element] as const,
                ),
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
                    this.span,
                    ` && (`,
                    codegen.node(this.matching),
                    `[runtime.variant] === ${index})`,
                );

                elements.forEach(([temporary, pattern], index) => {
                    codegen.write(
                        this.span,
                        ` && ((`,
                        codegen.node(temporary),
                        ` = `,
                        codegen.node(this.matching),
                        `[${index}]) || true)`,
                        pattern,
                    );
                });

                break;
            }
            default: {
                this.matchingConstructor satisfies never;
            }
        }
    }

    *temporaries() {
        if (this.matchingConstructor?.type === "variant") {
            for (const [temporary, element] of this.matchingConstructor.elements) {
                yield temporary;
                yield* element.temporaries();
            }
        }
    }
}
