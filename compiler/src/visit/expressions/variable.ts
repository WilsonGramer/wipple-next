import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { VariableExpression } from "../../syntax";
import { Constraint, InstantiateConstraint, TypeConstraint } from "../../typecheck";
import * as codegen from "../../codegen";
import { Type, TypeParameter } from "../../typecheck/constraints/type";

export class ResolvedVariable extends Fact<Node> {}
export class ResolvedConstant extends Fact<Node> {}
export class IsUnresolvedVariable extends Fact<null> {}

export const visitVariableExpression: Visit<VariableExpression> = (visitor, expression, node) => {
    const constraint = visitor.resolveName<Constraint>(
        expression.variable.value,
        node,
        (definition) => {
            switch (definition.type) {
                case "variable":
                    node.isHidden = true;

                    node.setCodegen(codegen.variableExpression(definition.node));

                    return [new TypeConstraint(node, definition.node), ResolvedVariable];
                case "constant":
                    const substitutions = new Map<TypeParameter, Type>();

                    node.setCodegen(codegen.constantExpression(definition.node, substitutions));

                    return [
                        new InstantiateConstraint({
                            source: node,
                            definition: definition.node,
                            substitutions,
                            replacements: new Map([[definition.node, node]]),
                        }),
                        ResolvedConstant,
                    ];
                default:
                    return undefined;
            }
        },
    );

    if (constraint != null) {
        visitor.addConstraints(constraint);
    } else {
        visitor.db.add(node, new IsUnresolvedVariable(null));
    }
};
