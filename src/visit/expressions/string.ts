import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { StringExpression } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedStringExpression extends Fact<Node> {}
export class UnresolvedStringExpression extends Fact<null> {}

export const visitStringExpression: Visit<StringExpression> = (visitor, _expression, node) => {
    const stringType = visitor.resolveName("String", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedStringExpression];
    });

    if (stringType != null) {
        visitor.addConstraints(new TypeConstraint(node, types.named(stringType, [])));
    } else {
        visitor.db.add(node, new UnresolvedStringExpression(null));
    }
};
