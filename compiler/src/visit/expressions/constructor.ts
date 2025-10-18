import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ConstructorExpression } from "../../syntax";
import { BoundConstraint, Constraint, InstantiateConstraint } from "../../typecheck";
import * as codegen from "../../codegen";

export class ResolvedConstructor extends Fact<Node> {}
export class IsUnresolvedConstructor extends Fact<null> {}

export const visitConstructorExpression: Visit<ConstructorExpression> = (
    visitor,
    expression,
    node,
) => {
    const constraints = visitor.resolveName<Constraint[]>(
        expression.trait.value,
        node,
        (definition) => {
            switch (definition.type) {
                case "trait": {
                    const substitutions = new Map<Node, Node>();

                    node.setCodegen(codegen.traitExpression(definition.node, substitutions));

                    return [
                        [
                            new InstantiateConstraint({
                                source: node,
                                definition: definition.node,
                                substitutions,
                                replacements: new Map([[definition.node, node]]),
                            }),
                            new BoundConstraint(node, {
                                source: node,
                                definition: visitor.currentDefinition?.node,
                                trait: definition.node,
                                substitutions,
                            }),
                        ],
                        ResolvedConstructor,
                    ];
                }
                case "markerConstructor":
                case "variantConstructor": {
                    node.setCodegen(definition.node);

                    return [
                        [
                            new InstantiateConstraint({
                                source: node,
                                definition: definition.node,
                                substitutions: new Map(),
                                replacements: new Map([[definition.node, node]]),
                            }),
                        ],
                        ResolvedConstructor,
                    ];
                }
                default:
                    return undefined;
            }
        },
    );

    if (constraints != null) {
        visitor.addConstraints(...constraints);
    } else {
        visitor.db.add(node, new IsUnresolvedConstructor(null));
    }
};
