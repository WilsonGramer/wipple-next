import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { IntrinsicExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";

export class IsIntrinsicExpression extends Fact<null> {}
export class InputInIntrinsicExpression extends Fact<Node> {}

export const visitIntrinsicExpression: Visit<IntrinsicExpression> = (visitor, expression, node) => {
    const inputs = expression.inputs.map((input) =>
        visitor.visit(input, InputInIntrinsicExpression, visitExpression),
    );

    visitor.db.add(node, new IsIntrinsicExpression(null));

    node.setCodegen(codegen.intrinsicExpression(expression.name.value, inputs));
};
