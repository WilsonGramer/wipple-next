import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ConstructorExpression } from "../../syntax";
import { BoundConstraint, Constraint, InstantiateConstraint } from "../../typecheck";
import * as codegen from "../../codegen";
import { Type, TypeParameter } from "../../typecheck/constraints/type";

export class ResolvedConstructor extends Fact<Node> {}
export class IsUnresolvedConstructor extends Fact<null> {}

export const visitConstructorExpression: Visit<ConstructorExpression> = (
    visitor,
    expression,
    node,
) => {
    const constraint = visitor.resolveName<Constraint>(
        expression.trait.value,
        node,
        (definition) => {
            switch (definition.type) {
                case "trait": {
                    const substitutions = new Map<TypeParameter, Type>();
                    const replacements = new Map([[definition.node, node]]);

                    node.setCodegen(codegen.traitExpression(definition.node, substitutions));

                    return [
                        new InstantiateConstraint({
                            source: node,
                            definition: definition.node,
                            substitutions,
                            replacements,
                        }),
                        ResolvedConstructor,
                    ];
                }
                case "markerConstructor":
                case "variantConstructor": {
                    node.setCodegen(definition.node);

                    return [
                        new InstantiateConstraint({
                            source: node,
                            definition: definition.node,
                            substitutions: new Map(),
                            replacements: new Map([[definition.node, node]]),
                        }),
                        ResolvedConstructor,
                    ];
                }
                default:
                    return undefined;
            }
        },
    );

    if (constraint != null) {
        visitor.addConstraints(constraint);
    } else {
        visitor.db.add(node, new IsUnresolvedConstructor(null));
    }
};
