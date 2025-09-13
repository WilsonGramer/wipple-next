import { Visit } from "../visitor";
import { Constraint } from "../../syntax";
import { visitBoundConstraint } from "./bound";

export const visitConstraint: Visit<Constraint> = (visitor, statement, node) => {
    switch (statement.type) {
        case "bound": {
            return visitBoundConstraint(visitor, statement, node);
        }
        case "default": {
            throw new Error("TODO");
        }
    }
};
