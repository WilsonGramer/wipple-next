import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TupleExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";

export class IsTupleExpression extends Fact<null> {}
export class ElementInTupleExpression extends Fact<Node> {}

export const visitTupleExpression: Visit<TupleExpression> = (visitor, expression, node) => {
    const elements = expression.elements.map((element) =>
        visitor.visit(element, ElementInTupleExpression, visitExpression),
    );

    visitor.db.add(node, new IsTupleExpression(null));

    node.setCodegen(codegen.tupleExpression(elements));
};
