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
import { visitConstructorPattern } from "./constructor";
import { visitOrPattern } from "./or";
import { TypeConstraint } from "../../typecheck";
import { visitStructurePattern } from "./structure";
import { visitTuplePattern } from "./tuple";

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
        case "structure":
            return visitStructurePattern(visitor, pattern, node);
        case "set":
            return visitSetPattern(visitor, pattern, node);
        case "constructor":
            return visitConstructorPattern(visitor, pattern, node);
        case "or":
            return visitOrPattern(visitor, pattern, node);
        case "tuple":
            return visitTuplePattern(visitor, pattern, node);
        case "annotate":
            return visitAnnotatePattern(visitor, pattern, node);
        default:
            pattern satisfies never;
    }
};
