import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TupleType } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { visitType } from ".";

export class IsTupleType extends Fact<null> {}
export class ElementInTupleType extends Fact<Node> {}

export const visitTupleType: Visit<TupleType> = (visitor, expression, node) => {
    const elements = expression.elements.map((element) =>
        visitor.visit(element, ElementInTupleType, visitType),
    );

    visitor.db.add(node, new IsTupleType(null));
    visitor.addConstraints(new TypeConstraint(node, types.tuple(elements)));
};
