import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TextExpression } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedTextExpression extends Fact<Node> {}
export class UnresolvedTextExpression extends Fact<null> {}

export const visitTextExpression: Visit<TextExpression> = (visitor, _expression, node) => {
    const textType = visitor.resolveName("Text", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedTextExpression];
    });

    if (textType != null) {
        visitor.addConstraints(new TypeConstraint(node, types.named(textType, [])));
    } else {
        visitor.db.add(node, new UnresolvedTextExpression(null));
    }
};
