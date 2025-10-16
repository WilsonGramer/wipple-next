import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { AnnotatePattern } from "../../syntax";
import { visitPattern } from ".";
import { TypeConstraint } from "../../typecheck";
import { visitType } from "../types";

export class IsAnnotatePattern extends Fact<null> {}
export class ValueInAnnotatePattern extends Fact<Node> {}
export class TypeInAnnotatePattern extends Fact<Node> {}

export const visitAnnotatePattern: Visit<AnnotatePattern> = (visitor, expression, node) => {
    node.isHidden = true;

    const value = visitor.visit(expression.left, ValueInAnnotatePattern, visitPattern);
    const type = visitor.visit(expression.right, TypeInAnnotatePattern, visitType);

    visitor.db.add(node, new IsAnnotatePattern(null));
    visitor.addConstraints(new TypeConstraint(value, type), new TypeConstraint(node, value));
};
