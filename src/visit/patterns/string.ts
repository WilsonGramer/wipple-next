import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { StringPattern } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedStringPattern extends Fact<Node> {}
export class UnresolvedStringPattern extends Fact<null> {}

export const visitStringPattern: Visit<StringPattern> = (visitor, _expression, node) => {
    const stringType = visitor.resolveName("String", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedStringPattern];
    });

    if (stringType != null) {
        visitor.addConstraints(new TypeConstraint(node, types.named(stringType, [])));
    } else {
        visitor.db.add(node, new UnresolvedStringPattern(null));
    }
};
