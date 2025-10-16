import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { NumberExpression } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import * as codegen from "../../codegen";

export class ResolvedNumberExpression extends Fact<Node> {}
export class IsUnresolvedNumberExpression extends Fact<null> {}

export const visitNumberExpression: Visit<NumberExpression> = (visitor, expression, node) => {
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

    node.setCodegen(codegen.numberExpression(expression.value.value));
};
