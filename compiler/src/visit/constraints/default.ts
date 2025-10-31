import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { DefaultConstraint as SyntaxDefaultConstraint } from "../../syntax";
import { visitType } from "../types";
import { TypeConstraint } from "../../typecheck";

export class ParameterInDefaultConstraint extends Fact<Node> {}
export class TypeInDefaultConstraint extends Fact<Node> {}

export const visitDefaultConstraint: Visit<SyntaxDefaultConstraint> = (
    visitor,
    statement,
    _node,
) => {
    const parameter = visitor.visit(statement.parameter, ParameterInDefaultConstraint, visitType);
    const type = visitor.visit(statement.value, TypeInDefaultConstraint, visitType);

    const constraint = new TypeConstraint(parameter, type);
    constraint.isDefault = true;

    visitor.addConstraints(constraint);
};
