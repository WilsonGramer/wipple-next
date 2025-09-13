import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { NumberExpression } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedNumberExpression extends Fact<Node> {}
export class IsUnresolvedNumberExpression extends Fact<null> {}

export const visitNumberExpression: Visit<NumberExpression> = (visitor, _expression, node) => {
    const numberType = visitor.resolveName("Number", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedNumberExpression];
    });

    if (numberType != null) {
        visitor.addConstraints(new TypeConstraint(node, types.named(numberType, [])));
    } else {
        visitor.db.add(node, new IsUnresolvedNumberExpression(null));
    }
};
