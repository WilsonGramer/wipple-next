import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { SetPattern } from "../../syntax";
import { TypeConstraint, Constraint } from "../../typecheck";
import * as codegen from "../../codegen";

export class ResolvedSetPattern extends Fact<Node> {}
export class IsUnresolvedSetPattern extends Fact<null> {}

export const visitSetPattern: Visit<SetPattern> = (visitor, pattern, node) => {
    const constraint = visitor.resolveName<Constraint>(
        pattern.variable.value,
        node,
        (definition) => {
            switch (definition.type) {
                case "variable": {
                    visitor.currentMatch.conditions.push(
                        codegen.assignCondition(definition.node, visitor.currentMatch.value),
                    );

                    return [new TypeConstraint(node, definition.node), ResolvedSetPattern];
                }
                default:
                    return undefined;
            }
        },
    );

    if (constraint != null) {
        visitor.addConstraints(constraint);
    } else {
        visitor.db.add(node, new IsUnresolvedSetPattern(null));
    }
};
