import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { AsExpression } from "../../syntax";
import {
    BoundConstraint,
    Constraint,
    InstantiateConstraint,
    TypeConstraint,
    types,
} from "../../typecheck";
import * as codegen from "../../codegen";
import { Type } from "../../typecheck/constraints/type";
import { visitExpression } from ".";
import { visitType } from "../types";

export class ValueInAsExpression extends Fact<Node> {}
export class TypeInAsExpression extends Fact<Node> {}
export class ResolvedAsTrait extends Fact<Node> {}
export class IsUnresolvedAsTrait extends Fact<null> {}

export const visitAsExpression: Visit<AsExpression> = (visitor, expression, node) => {
    const value = visitor.visit(expression.left, ValueInAsExpression, visitExpression);

    const type = visitor.visit(expression.right, TypeInAsExpression, visitType);

    const constraints = visitor.resolveName<Constraint[]>("As", node, (definition) => {
        switch (definition.type) {
            case "trait":
                const substitutions = new Map<Node, Type>([
                    [definition.parameters[0], value], // input
                    [definition.parameters[1], type], // output
                ]);

                const asFunction = visitor.node(expression);

                node.setCodegen(
                    codegen.callExpression(
                        codegen.traitExpression(definition.node, substitutions),
                        [value],
                    ),
                );

                return [
                    [
                        new InstantiateConstraint({
                            source: asFunction,
                            definition: definition.node,
                            substitutions,
                            replacements: new Map([[definition.node, asFunction]]),
                        }),
                        new BoundConstraint({
                            source: asFunction,
                            trait: definition.node,
                            substitutions,
                        }),
                        new TypeConstraint(asFunction, types.function([value], type)),
                        new TypeConstraint(node, type),
                    ],
                    ResolvedAsTrait,
                ];
            default:
                return undefined;
        }
    });

    if (constraints != null) {
        visitor.addConstraints(...constraints);
    } else {
        visitor.db.add(node, new IsUnresolvedAsTrait(null));
    }
};
