import { Visit } from "../visitor";
import { Fact } from "../../db";
import { UnitType } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class IsUnitType extends Fact<null> {}

export const visitUnitType: Visit<UnitType> = (visitor, _type, node) => {
    visitor.addConstraints(new TypeConstraint(node, types.unit()));

    visitor.db.add(node, new IsUnitType(null));
};
