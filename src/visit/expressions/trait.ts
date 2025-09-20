import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TraitExpression } from "../../syntax";
import { BoundConstraint, Constraint, InstantiateConstraint } from "../../typecheck";
import * as codegen from "../../codegen";
import { Type } from "../../typecheck/constraints/type";

export class ResolvedTrait extends Fact<Node> {}
export class IsUnresolvedTrait extends Fact<null> {}

export const visitTraitExpression: Visit<TraitExpression> = (visitor, expression, node) => {
    const constraints = visitor.resolveName<Constraint[]>(
        expression.trait.value,
        node,
        (definition) => {
            switch (definition.type) {
                case "trait":
                    const substitutions = new Map<Node, Type>();

                    node.setCodegen(codegen.traitExpression(definition.node, substitutions));

                    return [
                        [
                            new InstantiateConstraint({
                                source: node,
                                definition: definition.node,
                                substitutions,
                                replacements: new Map([[definition.node, node]]),
                            }),
                            new BoundConstraint({
                                source: node,
                                trait: definition.node,
                                substitutions,
                            }),
                        ],
                        ResolvedTrait,
                    ];
                default:
                    return undefined;
            }
        },
    );

    if (constraints != null) {
        visitor.addConstraints(...constraints);
    } else {
        visitor.db.add(node, new IsUnresolvedTrait(null));
    }
};
