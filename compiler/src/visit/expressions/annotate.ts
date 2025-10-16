import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { AnnotateExpression } from "../../syntax";
import { visitExpression } from ".";
import { TypeConstraint } from "../../typecheck";
import { visitType } from "../types";

export class IsAnnotateExpression extends Fact<null> {}
export class ValueInAnnotateExpression extends Fact<Node> {}
export class TypeInAnnotateExpression extends Fact<Node> {}

export const visitAnnotateExpression: Visit<AnnotateExpression> = (visitor, expression, node) => {
    node.isHidden = true;

    const value = visitor.visit(expression.left, ValueInAnnotateExpression, visitExpression);
    const type = visitor.visit(expression.right, TypeInAnnotateExpression, visitType);

    visitor.db.add(node, new IsAnnotateExpression(null));
    visitor.addConstraints(new TypeConstraint(value, type), new TypeConstraint(node, value));

    node.setCodegen(value.codegen);
};
