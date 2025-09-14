import { Visitor } from "../visitor";
import { Node } from "../../db";
import { Pattern } from "../../syntax";
import { visitWildcardPattern } from "./wildcard";
import { visitVariablePattern } from "./variable";
import { visitAnnotatePattern } from "./annotate";
import { IsTyped } from "..";

export const visitPattern = (visitor: Visitor, pattern: Pattern, node: Node) => {
    visitor.db.add(node, new IsTyped(null));

    switch (pattern.type) {
        case "number":
            throw new Error("TODO");
        case "unit":
            throw new Error("TODO");
        case "wildcard":
            return visitWildcardPattern(visitor, pattern, node);
        case "variable":
            return visitVariablePattern(visitor, pattern, node);
        case "string":
            throw new Error("TODO");
        case "destructure":
            throw new Error("TODO");
        case "set":
            throw new Error("TODO");
        case "variant":
            throw new Error("TODO");
        case "or":
            throw new Error("TODO");
        case "tuple":
            throw new Error("TODO");
        case "annotate":
            return visitAnnotatePattern(visitor, pattern, node);
        default:
            pattern satisfies never;
    }
};
