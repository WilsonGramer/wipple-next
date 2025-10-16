import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { DoExpression } from "../../syntax";
import { visitExpression } from ".";
import { TypeConstraint, types } from "../../typecheck";
import * as codegen from "../../codegen";

export class IsDoExpression extends Fact<null> {}
export class BlockInDoExpression extends Fact<Node> {}

export const visitDoExpression: Visit<DoExpression> = (visitor, expression, node) => {
    const input = visitor.visit(expression.input, BlockInDoExpression, visitExpression);

    visitor.db.add(node, new IsDoExpression(null));
    visitor.addConstraints(new TypeConstraint(input, types.block(node)));

    node.setCodegen(codegen.callExpression(input, []));
};
