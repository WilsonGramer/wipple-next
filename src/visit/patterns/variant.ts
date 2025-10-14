import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { VariantPattern } from "../../syntax";
import * as codegen from "../../codegen";
import { visitPattern } from ".";
import { MarkerConstructorDefinition, VariantConstructorDefinition } from "../definitions";
import { InstantiateConstraint, TypeConstraint, types } from "../../typecheck";

export class IsVariantPattern extends Fact<null> {}
export class ResolvedMarker extends Fact<Node> {}
export class ResolvedVariant extends Fact<Node> {}
export class HasUnresolvedVariant extends Fact<null> {}
export class ElementInVariantPattern extends Fact<Node> {}

export const visitVariantPattern: Visit<VariantPattern> = (visitor, pattern, node) => {
    visitor.db.add(node, new IsVariantPattern(null));

    const definition = visitor.resolveName<
        MarkerConstructorDefinition | VariantConstructorDefinition
    >(pattern.variant.value, node, (definition) => {
        switch (definition.type) {
            case "markerConstructor":
                return [definition, ResolvedMarker];
            case "variantConstructor":
                return [definition, ResolvedVariant];
            default:
                return undefined;
        }
    });

    if (definition != null) {
        // TODO: Ensure `elements` has the right length

        const constructorNode = visitor.node(pattern);
        constructorNode.isHidden = true;

        visitor.addConstraints(
            new InstantiateConstraint({
                source: constructorNode,
                definition: definition.node,
                substitutions: new Map(),
                replacements: new Map([[definition.node, constructorNode]]),
            }),
        );

        switch (definition.type) {
            case "markerConstructor": {
                // No need to add a condition; markers only have one value

                visitor.addConstraints(new TypeConstraint(constructorNode, node));

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
                        () => visitor.visit(pattern, ElementInVariantPattern, visitPattern),
                    );

                    visitor.currentMatch.conditions.push(...conditions);
                    visitor.currentMatch.temporaries.push(...temporaries);

                    return element;
                });

                visitor.addConstraints(
                    new TypeConstraint(constructorNode, types.function(elements, node)),
                );

                break;
            }
            default:
                definition satisfies never;
        }
    } else {
        visitor.db.add(node, new HasUnresolvedVariant(null));
    }
};
