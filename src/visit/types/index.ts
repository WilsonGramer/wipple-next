import { Visitor } from "../visitor";
import { Fact, Node } from "../../db";
import { Type } from "../../syntax";
import { visitFunctionType } from "./function";
import { visitPlaceholderType } from "./placeholder";
import { visitUnitType } from "./unit";
import { visitParameterType } from "./parameter";
import { visitNamedType } from "./named";
import { visitBlockType } from "./block";
import { visitTupleType } from "./tuple";

export class IsType extends Fact<null> {}

export const visitType = (visitor: Visitor, type: Type, node: Node) => {
    visitor.db.add(node, new IsType(null));

    switch (type.type) {
        case "function":
            return visitFunctionType(visitor, type, node);
        case "placeholder":
            return visitPlaceholderType(visitor, type, node);
        case "unit":
            return visitUnitType(visitor, type, node);
        case "named":
            return visitNamedType(visitor, type, node);
        case "block":
            return visitBlockType(visitor, type, node);
        case "parameter":
            return visitParameterType(visitor, type, node);
        case "tuple":
            return visitTupleType(visitor, type, node);
        default:
            (type) satisfies never;
    }
};
