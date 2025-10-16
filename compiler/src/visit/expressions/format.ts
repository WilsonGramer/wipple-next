import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { FormatExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";

export class IsFormatExpression extends Fact<null> {}
export class InputInFormatExpression extends Fact<Node> {}

export const visitFormatExpression: Visit<FormatExpression> = (visitor, expression, node) => {
    const segments = expression.string.value.split("_");
    const trailing = segments.pop()!;

    // TODO: Ensure `inputs` has the right length

    const inputs = expression.inputs.map((input, index): [string, Node] => [
        segments[index],
        visitor.visit(input, InputInFormatExpression, visitExpression),
    ]);

    visitor.db.add(node, new IsFormatExpression(null));

    node.setCodegen(codegen.formatExpression(inputs, trailing));
};
