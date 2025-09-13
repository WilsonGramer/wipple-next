import { Visit } from "../visitor";
import { Fact } from "../../db";
import { UnitExpression } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class IsUnitExpression extends Fact<null> {}

export const visitUnitExpression: Visit<UnitExpression> = (visitor, _expression, node) => {
    visitor.addConstraints(new TypeConstraint(node, types.unit()));

    visitor.db.add(node, new IsUnitExpression(null));
};
