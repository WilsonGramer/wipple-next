import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { VariantPattern } from "../../syntax";
import * as codegen from "../../codegen";
import { visitPattern } from ".";
import { MarkerConstructorDefinition, VariantConstructorDefinition } from "../definitions";

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

    const elements = pattern.elements.map((element) =>
        visitor.visit(element, ElementInVariantPattern, visitPattern),
    );

    if (definition != null) {
        // TODO: Ensure `elements` has the right length

        switch (definition.type) {
            case "markerConstructor": {
                // No need to add a condition; markers only have one value
                break;
            }
            case "variantConstructor": {
                visitor.currentMatch.conditions.push(
                    codegen.isVariantCondition(visitor.currentMatch.value, definition.index),
                );

                elements.forEach((element, index) => {
                    visitor.currentMatch.conditions.push(
                        codegen.elementCondition(element, visitor.currentMatch.value, index),
                    );
                });

                break;
            }
            default:
                definition satisfies never;
        }
    } else {
        visitor.db.add(node, new HasUnresolvedVariant(null));
    }
};
