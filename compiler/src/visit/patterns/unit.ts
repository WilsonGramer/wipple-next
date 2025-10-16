import { Visit } from "../visitor";
import { Fact } from "../../db";
import { UnitPattern } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class IsUnitPattern extends Fact<null> {}

export const visitUnitPattern: Visit<UnitPattern> = (visitor, _pattern, node) => {
    visitor.addConstraints(new TypeConstraint(node, types.unit()));

    visitor.db.add(node, new IsUnitPattern(null));
};
