import { Visitor } from "../visitor";
import { Fact, Node } from "../../db";
import { Pattern } from "../../syntax";
import { visitWildcardPattern } from "./wildcard";
import { visitVariablePattern } from "./variable";
import { visitAnnotatePattern } from "./annotate";
import { IsTyped } from "..";
import { visitNumberPattern } from "./number";
import { visitStringExpression } from "../expressions/string";
import { visitSetPattern } from "./set";
import { visitUnitPattern } from "./unit";
import { visitVariantPattern } from "./variant";
import { visitOrPattern } from "./or";
import { TypeConstraint } from "../../typecheck";

export class IsPattern extends Fact<null> {}

export const visitPattern = (visitor: Visitor, pattern: Pattern, node: Node) => {
    visitor.db.add(node, new IsPattern(null));
    visitor.db.add(node, new IsTyped(null));

    visitor.addConstraints(new TypeConstraint(node, visitor.currentMatch.value));

    switch (pattern.type) {
        case "number":
            return visitNumberPattern(visitor, pattern, node);
        case "unit":
            return visitUnitPattern(visitor, pattern, node);
        case "wildcard":
            return visitWildcardPattern(visitor, pattern, node);
        case "variable":
            return visitVariablePattern(visitor, pattern, node);
        case "string":
            return visitStringExpression(visitor, pattern, node);
        case "destructure":
            throw new Error("TODO");
        case "set":
            return visitSetPattern(visitor, pattern, node);
        case "variant":
            return visitVariantPattern(visitor, pattern, node);
        case "or":
            return visitOrPattern(visitor, pattern, node);
        case "tuple":
            throw new Error("TODO");
        case "annotate":
            return visitAnnotatePattern(visitor, pattern, node);
        default:
            pattern satisfies never;
    }
};
