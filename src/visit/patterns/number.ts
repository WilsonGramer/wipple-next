import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { NumberPattern } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedNumberPattern extends Fact<Node> {}
export class IsUnresolvedNumberPattern extends Fact<null> {}

export const visitNumberPattern: Visit<NumberPattern> = (visitor, _expression, node) => {
    const numberType = visitor.resolveName("Number", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedNumberPattern];
    });

    if (numberType != null) {
        visitor.addConstraints(new TypeConstraint(node, types.named(numberType, [])));
    } else {
        visitor.db.add(node, new IsUnresolvedNumberPattern(null));
    }
};
