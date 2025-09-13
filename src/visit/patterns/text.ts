import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TextPattern } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedTextPattern extends Fact<Node> {}
export class UnresolvedTextPattern extends Fact<null> {}

export const visitTextPattern: Visit<TextPattern> = (visitor, _expression, node) => {
    const textType = visitor.resolveName("Text", node, (definition) => {
        if (definition.type !== "type") {
            return undefined;
        }

        return [definition.node, ResolvedTextPattern];
    });

    if (textType != null) {
        visitor.addConstraints(new TypeConstraint(node, types.named(textType, [])));
    } else {
        visitor.db.add(node, new UnresolvedTextPattern(null));
    }
};
