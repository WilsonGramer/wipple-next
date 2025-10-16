import { Visit } from "../visitor";
import { Constraint } from "../../syntax";
import { visitBoundConstraint } from "./bound";
import { visitDefaultConstraint } from "./default";
import { Fact } from "../../db";

export class IsConstraint extends Fact<null> {}

export const visitConstraint: Visit<Constraint> = (visitor, statement, node) => {
    visitor.db.add(node, new IsConstraint(null));

    switch (statement.type) {
        case "bound": {
            return visitBoundConstraint(visitor, statement, node);
        }
        case "default": {
            return visitDefaultConstraint(visitor, statement, node);
        }
    }
};
