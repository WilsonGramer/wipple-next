import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ConstructorPattern } from "../../syntax";
import * as codegen from "../../codegen";
import { visitPattern } from ".";
import { MarkerConstructorDefinition, VariantConstructorDefinition } from "../definitions";
import { InstantiateConstraint, TypeConstraint, types } from "../../typecheck";

export class IsUnresolvedConstructorPattern extends Fact<null> {}
export class ResolvedMarkerInConstructorPattern extends Fact<Node> {}
export class ResolvedVariantInConstructorPattern extends Fact<Node> {}
export class ElementInConstructorPattern extends Fact<Node> {}

export const visitConstructorPattern: Visit<ConstructorPattern> = (visitor, pattern, node) => {
    const definition = visitor.resolveName<
        MarkerConstructorDefinition | VariantConstructorDefinition
    >(pattern.constructor.value, node, (definition) => {
        switch (definition.type) {
            case "markerConstructor":
                return [definition, ResolvedMarkerInConstructorPattern];
            case "variantConstructor":
                return [definition, ResolvedVariantInConstructorPattern];
            default:
                return undefined;
        }
    });

    if (definition != null) {
        // TODO: Ensure `elements` has the right length

        switch (definition.type) {
            case "markerConstructor": {
                // No need to add a condition; markers only have one value

                visitor.addConstraints(
                    new InstantiateConstraint({
                        source: node,
                        definition: definition.node,
                        substitutions: new Map(),
                        replacements: new Map([[definition.node, node]]),
                    }),
                );

                break;
            }
            case "variantConstructor": {
                visitor.currentMatch.conditions.push(
                    codegen.isVariantCondition(visitor.currentMatch.value, definition.index),
                );

                const elements = pattern.elements.map((pattern, index) => {
                    const temporary = visitor.node(pattern);
                    visitor.currentMatch.temporaries.push(temporary);
                    visitor.currentMatch.conditions.push(
                        codegen.elementCondition(temporary, visitor.currentMatch.value, index),
                    );

                    const [element, { conditions, temporaries }] = visitor.withMatchValue(
                        temporary,
                        () => visitor.visit(pattern, ElementInConstructorPattern, visitPattern),
                    );

                    visitor.currentMatch.conditions.push(...conditions);
                    visitor.currentMatch.temporaries.push(...temporaries);

                    return element;
                });

                if (elements.length === 0) {
                    visitor.addConstraints(
                        new InstantiateConstraint({
                            source: node,
                            definition: definition.node,
                            substitutions: new Map(),
                            replacements: new Map([[definition.node, node]]),
                        }),
                    );
                } else {
                    const constructorNode = visitor.node(pattern);
                    constructorNode.isHidden = true;

                    visitor.addConstraints(
                        new InstantiateConstraint({
                            source: node,
                            definition: definition.node,
                            substitutions: new Map(),
                            replacements: new Map([[definition.node, constructorNode]]),
                        }),
                    );

                    visitor.addConstraints(
                        new TypeConstraint(constructorNode, types.function(elements, node)),
                    );
                }

                break;
            }
            default:
                definition satisfies never;
        }
    } else {
        visitor.db.add(node, new IsUnresolvedConstructorPattern(null));
    }
};
